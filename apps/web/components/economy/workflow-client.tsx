"use client";

import { useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, decodeEventLog, formatEther, parseEther, type Address, type Hash } from "viem";
import { somnia, somniaTransport } from "../../lib/contracts";
import { economyModules, type EconomyModuleId } from "../../lib/agents/economy-modules";
import { EconomyHero } from "./economy-shell";

const abi = [
  { type: "function", name: "dispatcher", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "create", stateMutability: "payable", inputs: [{ name: "beneficiary", type: "address" }, { name: "evidence", type: "string" }, { name: "sourceUrl", type: "string" }, { name: "mode", type: "uint8" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "recover", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "claimable", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "workflowCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "workflowIds", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "uint256" }], outputs: [{ type: "uint256[]" }] },
  { type: "function", name: "workflows", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint64" }, { type: "uint64" }, { type: "uint8" }, { type: "uint16" }, { type: "uint8" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "bytes32" }] },
  { type: "event", name: "WorkflowRequested", inputs: [{ indexed: true, name: "requestId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: true, name: "beneficiary", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "mode", type: "uint8" }, { indexed: false, name: "sourceUrl", type: "string" }, { indexed: false, name: "deadline", type: "uint64" }] }
] as const;
const dispatcherAbi = [{ type: "function", name: "requiredDepositFor", stateMutability: "view", inputs: [{ type: "uint8" }], outputs: [{ type: "uint256" }] }] as const;
const publicClient = createPublicClient({ chain: somnia, transport: somniaTransport() });

export function WorkflowClient({ id }: { id: EconomyModuleId }) {
  const module = economyModules[id];
  const [beneficiary, setBeneficiary] = useState("");
  const [evidence, setEvidence] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [funding, setFunding] = useState("0.1");
  const [account, setAccount] = useState<Address>();
  const [claimable, setClaimable] = useState(0n);
  const [ids, setIds] = useState<bigint[]>([]);
  const [status, setStatus] = useState("");

  const refresh = async (who = account) => {
    if (module.address === "0x0000000000000000000000000000000000000000") return;
    const page = await publicClient.readContract({ address: module.address, abi, functionName: "workflowIds", args: [0n, 20n] });
    setIds([...page].reverse());
    if (who) setClaimable(await publicClient.readContract({ address: module.address, abi, functionName: "claimable", args: [who] }));
  };
  useEffect(() => { void refresh(); }, [module.address]);

  const wallet = async () => {
    if (!window.ethereum) throw new Error("Connect an injected wallet.");
    const client = createWalletClient({ chain: somnia, transport: custom(window.ethereum) });
    const [selected] = await client.requestAddresses();
    setAccount(selected);
    return { client, selected };
  };
  const send = async (functionName: "recover" | "withdraw", args: readonly bigint[] = []) => {
    const { client, selected } = await wallet();
    const hash = await client.writeContract({ address: module.address, abi, functionName, account: selected, args: args as never });
    setStatus(`Submitted ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    await refresh(selected);
  };
  const create = async () => {
    try {
      const { client, selected } = await wallet();
      const mode = module.website ? 1 : 0;
      const dispatcher = await publicClient.readContract({ address: module.address, abi, functionName: "dispatcher" });
      const deposit = await publicClient.readContract({ address: dispatcher, abi: dispatcherAbi, functionName: "requiredDepositFor", args: [mode] });
      const hash = await client.writeContract({ address: module.address, abi, functionName: "create", account: selected, args: [beneficiary as Address, evidence, sourceUrl, mode], value: deposit + parseEther(funding) });
      setStatus(`Submitted ${hash}. Waiting for Somnia receipt.`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const requestId = requestIdFrom(receipt.logs, module.address);
      setStatus(`Request ${requestId ?? "created"} is awaiting the Somnia callback. Transaction ${hash}`);
      await refresh(selected);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Transaction failed."); }
  };

  const configured = module.address !== "0x0000000000000000000000000000000000000000";
  return <><EconomyHero eyebrow="Somnia-only writable module" title={module.title}>{module.description}</EconomyHero>
    {!configured ? <p className="panel rounded-xl p-5 text-amber-200">Deployment address is not configured.</p> :
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <section className="panel space-y-4 rounded-2xl p-5">
        <h2 className="text-xl font-semibold text-white">Create funded workflow</h2>
        <input value={beneficiary} onChange={e => setBeneficiary(e.target.value)} placeholder="Beneficiary 0x..." className="w-full rounded-xl border border-white/10 bg-black/20 p-3" />
        <textarea value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="Terms, evidence, commitment, or assessment" className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3" />
        {module.website && <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https:// source URL sent through Somnia Website agent" className="w-full rounded-xl border border-white/10 bg-black/20 p-3" />}
        <input value={funding} onChange={e => setFunding(e.target.value)} placeholder="Escrow STT" className="w-full rounded-xl border border-white/10 bg-black/20 p-3" />
        <button onClick={create} className="rounded-xl bg-cyan-200 px-4 py-3 font-semibold text-black">Sign Somnia transaction</button>
        <p className="break-all text-xs text-white/50">{status}</p>
      </section>
      <section className="panel rounded-2xl p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-white">Claims and proof</h2><button onClick={() => void send("withdraw")} disabled={!claimable} className="rounded-lg border border-cyan-200/30 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40">Withdraw {formatEther(claimable)} STT</button></div>
        <p className="mt-3 break-all font-mono text-xs text-cyan-200/60">{module.address}</p>
        <div className="mt-5 space-y-2">{ids.map(requestId => <div key={requestId.toString()} className="rounded-xl border border-white/10 p-3"><a href={`https://shannon-explorer.somnia.network/address/${module.address}`} target="_blank" className="text-cyan-200">Request #{requestId.toString()}</a><button onClick={() => void send("recover", [requestId])} className="ml-3 text-xs text-white/50">Recover after timeout</button></div>)}</div>
      </section>
    </div>}</>;
}

function requestIdFrom(logs: readonly { address: Address; data: Hash; topics: readonly Hash[] }[], module: Address) {
  for (const log of logs) try {
    if (log.address.toLowerCase() !== module.toLowerCase()) continue;
    const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics as [Hash, ...Hash[]] });
    if (decoded.eventName === "WorkflowRequested") return (decoded.args as { requestId: bigint }).requestId.toString();
  } catch {}
  return null;
}
