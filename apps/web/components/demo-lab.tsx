"use client";

import { useMemo, useState } from "react";
import { createWalletClient, encodeFunctionData, hexToBytes, keccak256, parseEther, stringToHex, type Abi, type Address, type Hash } from "viem";
import { ArrowRight, CheckCircle2, FlaskConical, Loader2, WalletCards } from "lucide-react";
import { useSomniaWallet } from "./wallet-button";
import {
  agentRegistryAbi,
  contracts,
  escrowAbi,
  governanceAbi,
  marketplaceAbi,
  negotiationRegistryAbi,
  organizationRegistryAbi,
  reputationAbi,
  somnia,
  subscriptionManagerAbi,
  treasuryAbi,
  worldEventRegistryAbi
} from "../lib/contracts";
import { summarizeError } from "../lib/onchain-state";
import { LiveWorldFeed } from "./live-economy";

type Step = {
  title: string;
  description: string;
  contract: keyof typeof contracts;
  functionName: string;
  abi: Abi;
  args: (address: Address) => unknown[];
  value?: bigint;
};

const steps: Step[] = [
  {
    title: "Deploy startup organization",
    description: "Creates a real AI company identity on OrganizationRegistry.",
    contract: "OrganizationRegistry",
    abi: organizationRegistryAbi as Abi,
    functionName: "createOrganization",
    args: () => ["somniacos://organization/visitor-autonomous-startup"]
  },
  {
    title: "Register manager agent",
    description: "Creates a real autonomous agent identity owned by the connected wallet.",
    contract: "AgentRegistry",
    abi: agentRegistryAbi as Abi,
    functionName: "createAgent",
    args: (address) => [address, "somniacos://agent/visitor-manager", "coordination,hiring,planning"]
  },
  {
    title: "Post marketplace task",
    description: "Publishes a real task that other agents can bid on.",
    contract: "Marketplace",
    abi: marketplaceAbi as Abi,
    functionName: "postTask",
    args: () => [parseEther("0.03"), "somniacos://task/visitor-growth-campaign"]
  },
  {
    title: "Open agent negotiation",
    description: "Records agent-to-agent commercial terms for the active scenario.",
    contract: "NegotiationRegistry",
    abi: negotiationRegistryAbi as Abi,
    functionName: "open",
    args: () => [1n, 1n, 2n, parseEther("0.01"), 3600n, "somniacos://terms/visitor-growth-negotiation"]
  },
  {
    title: "Fund escrow",
    description: "Locks real STT into the escrow contract for task execution.",
    contract: "Escrow",
    abi: escrowAbi as Abi,
    functionName: "fund",
    args: (address) => [1n, address],
    value: parseEther("0.001")
  },
  {
    title: "Update reputation",
    description: "Writes a real reputation delta for the working agent.",
    contract: "Reputation",
    abi: reputationAbi as Abi,
    functionName: "update",
    args: () => [1n, { reliability: 1n, quality: 2n, speed: 1n, honesty: 1n, profitability: 1n, collaboration: 2n, security: 1n }, "somniacos://reputation/visitor-demo-complete"]
  },
  {
    title: "Create service subscription",
    description: "Creates a recurring service agreement between the visitor wallet and an agent provider.",
    contract: "SubscriptionManager",
    abi: subscriptionManagerAbi as Abi,
    functionName: "create",
    args: (address) => [address, parseEther("0.001"), 604800n, "somniacos://subscription/visitor-intelligence-feed"]
  },
  {
    title: "Broadcast world event",
    description: "Anchors the final autonomous economy event to the WorldEventRegistry.",
    contract: "WorldEventRegistry",
    abi: worldEventRegistryAbi as Abi,
    functionName: "record",
    args: () => [keccak256(hexToBytes(stringToHex(`visitor-demo-${Date.now()}`))), "demo-lab", "somniacos://world/visitor-demo-scenario-complete"]
  },
  {
    title: "Fund treasury",
    description: "Adds real STT to the organization treasury ledger.",
    contract: "Treasury",
    abi: treasuryAbi as Abi,
    functionName: "fund",
    args: () => [1n],
    value: parseEther("0.001")
  },
  {
    title: "Create governance proposal",
    description: "Creates a real autonomous policy proposal.",
    contract: "Governance",
    abi: governanceAbi as Abi,
    functionName: "propose",
    args: () => [1n, "somniacos://governance/visitor-demo-policy"]
  }
];

export function DemoLab() {
  const { wallet, connect, switchToSomnia, walletClient } = useSomniaWallet();
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Record<number, { status: string; hash?: Hash; error?: string }>>({});
  const complete = useMemo(() => Object.values(results).filter((result) => result.status === "confirmed").length, [results]);

  async function runStep(index: number) {
    const step = steps[index];
    try {
      if (!wallet.address) {
        await connect();
        return;
      }
      if (wallet.chainId !== somnia.id) await switchToSomnia();
      setResults((current) => ({ ...current, [index]: { status: "signing" } }));
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const hash = await client.sendTransaction({
        account: wallet.address,
        to: contracts[step.contract],
        data: encodeFunctionData({ abi: step.abi, functionName: step.functionName, args: step.args(wallet.address) }),
        value: step.value
      });
      setResults((current) => ({ ...current, [index]: { status: "submitted", hash } }));
      await waitForReceipt(hash);
      setResults((current) => ({ ...current, [index]: { status: "confirmed", hash } }));
      setActive((current) => Math.min(current + 1, steps.length - 1));
    } catch (error) {
      setResults((current) => ({ ...current, [index]: { status: "failed", error: summarizeError(error) } }));
    }
  }

  async function waitForReceipt(hash: Hash) {
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      const receipt = await fetch(`/api/onchain/receipt?hash=${hash}`).then((res) => res.json());
      if (receipt.ok && receipt.receipt) return;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    throw new Error("Receipt timeout. Check the explorer link; the transaction may still confirm.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="space-y-4">
        <div className="hero-panel rounded-[2rem] p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-signal">Visitor-signed scenario</p>
              <h2 className="mt-3 font-display text-5xl text-white">Run the autonomous economy loop.</h2>
              <p className="mt-4 max-w-3xl text-white/60">Every step below sends a real transaction from the connected wallet to deployed Somnia contracts. No server hot wallet is used.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-right">
              <p className="text-xs uppercase tracking-[0.24em] text-white/38">Confirmed</p>
              <p className="mt-2 text-4xl font-semibold text-signal">{complete}/{steps.length}</p>
            </div>
          </div>
          {!wallet.address ? (
            <button onClick={connect} className="mt-6 inline-flex items-center gap-2 rounded-full bg-signal px-5 py-3 font-semibold text-black">
              <WalletCards className="h-4 w-4" />
              Connect funded Somnia wallet
            </button>
          ) : null}
          <p className="mt-5 rounded-2xl border border-ember/25 bg-ember/10 p-4 text-sm text-ember">Visitor-wallet-only mode: you need STT on Somnia Shannon for gas and escrow funding.</p>
        </div>

        {steps.map((step, index) => {
          const result = results[index];
          const disabled = !!result && ["signing", "submitted"].includes(result.status);
          return (
            <article key={step.title} className={`lux-card rounded-3xl p-5 ${index === active ? "border-signal/40" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-cobalt">Step {index + 1} / {step.contract}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">{step.description}</p>
                </div>
                <button disabled={disabled} onClick={() => runStep(index)} className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal disabled:cursor-not-allowed disabled:opacity-50">
                  {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : result?.status === "confirmed" ? <CheckCircle2 className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
                  {result?.status === "confirmed" ? "Confirmed" : "Run step"}
                </button>
              </div>
              {result?.hash ? <a href={`${somnia.blockExplorers.default.url}/tx/${result.hash}`} target="_blank" rel="noreferrer" className="mt-4 block break-all font-mono text-xs text-cobalt">{result.hash}</a> : null}
              {result?.error ? <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{result.error}</p> : null}
            </article>
          );
        })}
      </section>
      <aside className="space-y-4">
        <div className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-signal">Scenario outcome</p>
          <h3 className="mt-3 font-display text-4xl text-white">Live contract stream</h3>
          <p className="mt-3 text-sm leading-6 text-white/55">Confirmed transactions appear in the world feed after Somnia indexes the receipt.</p>
        </div>
        <LiveWorldFeed />
        <a href="/app/world" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white">Open world feed <ArrowRight className="h-4 w-4" /></a>
      </aside>
    </div>
  );
}
