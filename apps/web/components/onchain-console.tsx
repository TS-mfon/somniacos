"use client";

import { useEffect, useMemo, useState } from "react";
import { createWalletClient, encodeFunctionData, formatEther, hexToBytes, keccak256, parseEther, stringToHex, type Abi, type Address, type Hash } from "viem";
import { Activity, Bot, Building2, CheckCircle2, Gavel, HandCoins, Landmark, RefreshCw, Shield, Siren, Sparkles, Store, Users, WalletCards } from "lucide-react";
import { useSomniaWallet } from "./wallet-button";
import {
  agentRegistryAbi,
  contracts,
  escrowAbi,
  governanceAbi,
  marketplaceAbi,
  negotiationRegistryAbi,
  organizationRegistryAbi,
  partnershipRegistryAbi,
  reputationAbi,
  somnia,
  subscriptionManagerAbi,
  treasuryAbi,
  worldEventRegistryAbi
} from "../lib/contracts";

type ActivityItem = {
  id: string;
  contract: string;
  eventName: string;
  title: string;
  args: Record<string, string>;
  value?: string;
  transactionHash: string;
  blockNumber: string;
};

type ActivityResponse = {
  ok: boolean;
  blockNumber?: string;
  count?: number;
  activity: ActivityItem[];
  error?: string;
};

const modeMeta: Record<string, { icon: React.ReactNode; title: string; action: string; description: string }> = {
  feed: { icon: <Activity />, title: "Live Onchain World Feed", action: "Record World Event", description: "Read and publish real Somnia contract events." },
  agents: { icon: <Bot />, title: "Agent Registry", action: "Create Agent", description: "Register an autonomous agent identity on Somnia." },
  organizations: { icon: <Building2 />, title: "Organization Registry", action: "Create Organization", description: "Create AI companies and assign agent members." },
  market: { icon: <Store />, title: "Task Marketplace", action: "Post Task", description: "Post real marketplace tasks and receive agent proposals." },
  negotiation: { icon: <Users />, title: "Negotiation Engine", action: "Open Negotiation", description: "Create and update agent-to-agent commercial terms." },
  ledger: { icon: <HandCoins />, title: "Escrow And Payments", action: "Fund Escrow", description: "Fund, release, and dispute STT escrow deals." },
  reputation: { icon: <Sparkles />, title: "Reputation Network", action: "Update Reputation", description: "Write real reputation deltas for agents." },
  governance: { icon: <Gavel />, title: "Governance Console", action: "Create Proposal", description: "Create proposals, vote, and execute passed decisions." },
  security: { icon: <Shield />, title: "Security Events", action: "Record Alert", description: "Publish live security alerts to the world registry." },
  treasury: { icon: <Landmark />, title: "Treasury Console", action: "Fund Treasury", description: "Fund organization treasuries and assign budgets." },
  partnership: { icon: <Users />, title: "Partnership Registry", action: "Create Partnership", description: "Create real collaboration links between agents." },
  memory: { icon: <Siren />, title: "Memory Events", action: "Record Memory", description: "Anchor public memory/reflection events onchain." },
  status: { icon: <CheckCircle2 />, title: "Deployment Status", action: "Refresh Chain", description: "Verify deployment, latest block, and contract activity." },
  settings: { icon: <WalletCards />, title: "Account Settings", action: "Connect Wallet", description: "Manage wallet, network, and transaction readiness." },
  simulation: { icon: <Activity />, title: "Agent Runtime Activity", action: "Record Runtime Tick", description: "Anchor autonomous loop activity into the world event registry." },
  map: { icon: <Users />, title: "Economy Graph", action: "Create Partnership", description: "Generate real graph edges through partnerships, hires, and escrow." },
  dispute: { icon: <Gavel />, title: "Dispute Court", action: "Open Dispute", description: "Dispute escrow deals and surface evidence onchain." }
};

const defaultFields = {
  agentWallet: "",
  metadataURI: "somniacos://agent/manager",
  skills: "coordination,hiring,treasury",
  organizationMetadata: "somniacos://organization/autonomous-lab",
  organizationId: "1",
  agentId: "1",
  agentIdB: "2",
  role: "Manager",
  taskId: "1",
  providerAgentId: "2",
  buyerAgentId: "1",
  sellerAgentId: "2",
  negotiationId: "1",
  dealId: "1",
  proposalId: "1",
  subscriptionId: "1",
  payee: "",
  provider: "",
  recipient: "",
  amount: "0.01",
  budget: "1",
  price: "0.1",
  deadline: "3600",
  termsURI: "somniacos://terms/demo",
  reasonURI: "somniacos://evidence/demo",
  kind: "security",
  support: "true"
};

export function OnchainConsole({ mode }: { mode: string }) {
  const meta = modeMeta[mode] ?? modeMeta.feed;
  const { wallet, connect, switchToSomnia, walletClient } = useSomniaWallet();
  const [activity, setActivity] = useState<ActivityResponse>({ ok: true, activity: [] });
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState(defaultFields);
  const [tx, setTx] = useState<{ status: string; hash?: Hash; error?: string }>({ status: "idle" });

  const visibleActivity = useMemo(() => filterActivity(activity.activity, mode), [activity.activity, mode]);

  async function loadActivity() {
    setLoading(true);
    try {
      const response = await fetch("/api/onchain/activity", { cache: "no-store" });
      const json = await response.json() as ActivityResponse;
      setActivity(json);
    } catch (error) {
      setActivity({ ok: false, activity: [], error: error instanceof Error ? error.message : "Failed to load onchain activity" });
    } finally {
      setLoading(false);
    }
  }

  async function send(address: Address, abi: Abi, functionName: string, args: unknown[] = [], value?: bigint) {
    try {
      if (!wallet.address) {
        await connect();
        return;
      }
      if (wallet.chainId !== somnia.id) {
        await switchToSomnia();
      }
      setTx({ status: "Waiting for wallet signature" });
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const hash = await client.sendTransaction({
        account: wallet.address,
        to: address,
        data: encodeFunctionData({ abi, functionName, args }),
        value
      });
      setTx({ status: "Transaction submitted", hash });
      await waitForReceipt(hash);
      setTx({ status: "Confirmed on Somnia", hash });
      await loadActivity();
    } catch (error) {
      setTx({ status: "Transaction failed", error: error instanceof Error ? error.message : "Unknown transaction error" });
    }
  }

  async function waitForReceipt(hash: Hash) {
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      const receipt = await fetch(`/api/onchain/receipt?hash=${hash}`).then((res) => res.json());
      if (receipt.ok && receipt.receipt) return receipt.receipt;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  function set(key: keyof typeof defaultFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    void loadActivity();
    const interval = setInterval(loadActivity, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="space-y-6">
        <div className="hero-panel relative overflow-hidden rounded-[2rem] p-7">
          <div className="absolute right-8 top-8 h-32 w-32 rounded-full bg-signal/10 blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-signal/30 bg-signal/10 text-signal">
                {meta.icon}
              </div>
              <h2 className="font-display text-5xl leading-none text-white">{meta.title}</h2>
              <p className="mt-4 max-w-2xl text-white/60">{meta.description}</p>
            </div>
            <button onClick={loadActivity} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white hover:border-signal/40">
              <RefreshCw className="h-4 w-4" />
              Refresh onchain
            </button>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <Stat label="Latest block" value={activity.blockNumber ?? "..."} />
            <Stat label="Events" value={String(activity.count ?? 0)} />
            <Stat label="Wallet" value={wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Disconnected"} />
            <Stat label="Balance" value={wallet.balance ? `${Number(wallet.balance).toFixed(3)} STT` : "Connect"} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleActivity.map((item) => (
            <article key={item.id} className="lux-card rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-signal">{item.contract}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">#{item.blockNumber}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-white/58">
                {Object.entries(item.args).slice(0, 5).map(([key, value]) => <p key={key} className="break-all"><span className="text-white/34">{key}:</span> {String(value)}</p>)}
              </div>
              {item.value ? <p className="mt-4 text-signal">{item.value}</p> : null}
              <a className="mt-4 inline-block break-all font-mono text-xs text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${item.transactionHash}`} target="_blank" rel="noreferrer">{item.transactionHash}</a>
            </article>
          ))}
        </div>

        {!loading && visibleActivity.length === 0 ? (
          <div className="lux-card rounded-3xl p-8 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-ember">No matching contract events yet</p>
            <h3 className="mt-3 font-display text-4xl text-white">Create the first real action.</h3>
            <p className="mt-3 text-white/55">Use the transaction console to write to Somnia. New events appear here after confirmation.</p>
          </div>
        ) : null}
      </section>

      <aside className="hero-panel sticky top-24 h-fit rounded-[2rem] p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cobalt">Transaction Console</p>
        <h3 className="mt-3 font-display text-4xl text-white">{meta.action}</h3>
        <p className="mt-3 text-sm leading-6 text-white/55">Every button below submits a real transaction to deployed Somnia contracts. Connect a funded wallet on Somnia Shannon.</p>

        <div className="mt-5 grid gap-3">
          <Input label="Agent wallet / payee / provider" value={fields.agentWallet} placeholder={wallet.address ?? "0x..."} onChange={(value) => { set("agentWallet", value); set("payee", value); set("provider", value); set("recipient", value); }} />
          <Input label="Metadata / terms URI" value={fields.metadataURI} onChange={(value) => { set("metadataURI", value); set("organizationMetadata", value); set("termsURI", value); set("reasonURI", value); }} />
          <Input label="Skills / role / kind" value={fields.skills} onChange={(value) => { set("skills", value); set("role", value); set("kind", value); }} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Org ID" value={fields.organizationId} onChange={(value) => set("organizationId", value)} />
            <Input label="Agent ID" value={fields.agentId} onChange={(value) => set("agentId", value)} />
            <Input label="Task ID" value={fields.taskId} onChange={(value) => set("taskId", value)} />
            <Input label="Amount STT" value={fields.amount} onChange={(value) => set("amount", value)} />
            <Input label="Price STT" value={fields.price} onChange={(value) => set("price", value)} />
            <Input label="Deal/Proposal ID" value={fields.dealId} onChange={(value) => { set("dealId", value); set("proposalId", value); }} />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          {actions(fields, wallet.address).map((action) => (
            <button key={action.label} onClick={() => send(action.address, action.abi, action.functionName, action.args, action.value)} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-signal/40 hover:bg-signal/10">
              {action.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm">
          <p className="text-white/40">Status</p>
          <p className="mt-1 text-white">{tx.status}</p>
          {tx.hash ? <a href={`${somnia.blockExplorers.default.url}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="mt-2 block break-all font-mono text-xs text-cobalt">{tx.hash}</a> : null}
          {tx.error ? <p className="mt-2 text-danger">{tx.error}</p> : null}
        </div>
      </aside>
    </div>
  );
}

function actions(fields: typeof defaultFields, connected?: Address) {
  const fallback = connected ?? "0x0000000000000000000000000000000000000001";
  const wallet = (fields.agentWallet || fallback) as Address;
  const amountWei = parseEther(fields.amount || "0");
  const priceWei = parseEther(fields.price || "0");
  const budgetWei = parseEther(fields.budget || fields.amount || "0");

  return [
    { label: "Create Agent", address: contracts.AgentRegistry, abi: agentRegistryAbi as Abi, functionName: "createAgent", args: [wallet, fields.metadataURI, fields.skills] },
    { label: "Create Organization", address: contracts.OrganizationRegistry, abi: organizationRegistryAbi as Abi, functionName: "createOrganization", args: [fields.organizationMetadata] },
    { label: "Assign Agent To Organization", address: contracts.OrganizationRegistry, abi: organizationRegistryAbi as Abi, functionName: "setMember", args: [BigInt(fields.organizationId), BigInt(fields.agentId), fields.role] },
    { label: "Post Marketplace Task", address: contracts.Marketplace, abi: marketplaceAbi as Abi, functionName: "postTask", args: [budgetWei, fields.metadataURI] },
    { label: "Submit Agent Proposal", address: contracts.Marketplace, abi: marketplaceAbi as Abi, functionName: "submitProposal", args: [BigInt(fields.taskId), BigInt(fields.providerAgentId || fields.agentId), priceWei, fields.termsURI] },
    { label: "Hire Provider Agent", address: contracts.Marketplace, abi: marketplaceAbi as Abi, functionName: "hire", args: [BigInt(fields.taskId), BigInt(fields.providerAgentId || fields.agentId), priceWei] },
    { label: "Complete Task", address: contracts.Marketplace, abi: marketplaceAbi as Abi, functionName: "complete", args: [BigInt(fields.taskId)] },
    { label: "Open Negotiation", address: contracts.NegotiationRegistry, abi: negotiationRegistryAbi as Abi, functionName: "open", args: [BigInt(fields.taskId), BigInt(fields.buyerAgentId), BigInt(fields.sellerAgentId), priceWei, BigInt(fields.deadline), fields.termsURI] },
    { label: "Update Negotiation", address: contracts.NegotiationRegistry, abi: negotiationRegistryAbi as Abi, functionName: "update", args: [BigInt(fields.negotiationId), priceWei, BigInt(fields.deadline), fields.termsURI, 2] },
    { label: "Fund Escrow", address: contracts.Escrow, abi: escrowAbi as Abi, functionName: "fund", args: [BigInt(fields.taskId), wallet], value: amountWei },
    { label: "Release Escrow", address: contracts.Escrow, abi: escrowAbi as Abi, functionName: "release", args: [BigInt(fields.dealId)] },
    { label: "Open Escrow Dispute", address: contracts.Escrow, abi: escrowAbi as Abi, functionName: "dispute", args: [BigInt(fields.dealId), fields.reasonURI] },
    { label: "Create Subscription", address: contracts.SubscriptionManager, abi: subscriptionManagerAbi as Abi, functionName: "create", args: [wallet, amountWei, BigInt(86400), fields.termsURI] },
    { label: "Cancel Subscription", address: contracts.SubscriptionManager, abi: subscriptionManagerAbi as Abi, functionName: "cancel", args: [BigInt(fields.subscriptionId)] },
    { label: "Update Reputation", address: contracts.Reputation, abi: reputationAbi as Abi, functionName: "update", args: [BigInt(fields.agentId), { reliability: 2n, quality: 2n, speed: 1n, honesty: 1n, profitability: 2n, collaboration: 1n, security: 1n }, fields.reasonURI] },
    { label: "Fund Treasury", address: contracts.Treasury, abi: treasuryAbi as Abi, functionName: "fund", args: [BigInt(fields.organizationId)], value: amountWei },
    { label: "Set Agent Budget", address: contracts.Treasury, abi: treasuryAbi as Abi, functionName: "setBudget", args: [BigInt(fields.organizationId), BigInt(fields.agentId), amountWei] },
    { label: "Create Governance Proposal", address: contracts.Governance, abi: governanceAbi as Abi, functionName: "propose", args: [BigInt(fields.organizationId), fields.metadataURI] },
    { label: "Vote Governance Proposal", address: contracts.Governance, abi: governanceAbi as Abi, functionName: "vote", args: [BigInt(fields.proposalId), BigInt(fields.agentId), fields.support === "true"] },
    { label: "Create Partnership", address: contracts.PartnershipRegistry, abi: partnershipRegistryAbi as Abi, functionName: "create", args: [BigInt(fields.agentId), BigInt(fields.agentIdB), fields.termsURI] },
    { label: "Record World Event", address: contracts.WorldEventRegistry, abi: worldEventRegistryAbi as Abi, functionName: "record", args: [keccak256(hexToBytes(stringToHex(`${Date.now()}-${fields.kind}`))), fields.kind, fields.metadataURI] }
  ];
}

function filterActivity(activity: ActivityItem[], mode: string) {
  const match: Record<string, string[]> = {
    feed: [],
    simulation: ["WorldEventRegistry"],
    agents: ["AgentRegistry"],
    organizations: ["OrganizationRegistry"],
    market: ["Marketplace"],
    negotiation: ["NegotiationRegistry"],
    ledger: ["Escrow", "Treasury", "SubscriptionManager"],
    reputation: ["Reputation"],
    memory: ["WorldEventRegistry"],
    map: ["PartnershipRegistry", "Marketplace", "Escrow"],
    governance: ["Governance"],
    dispute: ["Escrow", "Governance"],
    security: ["WorldEventRegistry"],
    treasury: ["Treasury"],
    partnership: ["PartnershipRegistry"],
    status: []
  };
  const contracts = match[mode] ?? [];
  return contracts.length ? activity.filter((item) => contracts.includes(item.contract)) : activity;
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/38">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-signal/50" />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/36">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
