"use client";

import { useState } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, type Address } from "viem";
import { economyModules } from "../../lib/agents/economy-modules";
import { somnia, somniaTransport } from "../../lib/contracts";

const abi = [
  { type: "function", name: "claimable", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [], outputs: [] }
] as const;
const publicClient = createPublicClient({ chain: somnia, transport: somniaTransport() });

export function ClaimableDrawer() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Address>();
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const modules = Object.entries(economyModules).filter(([id]) => id !== "drafter" && id !== "website-research");

  const load = async () => {
    if (!window.ethereum) return;
    const client = createWalletClient({ chain: somnia, transport: custom(window.ethereum) });
    const [selected] = await client.requestAddresses();
    setAccount(selected);
    const reads = await Promise.all(modules.map(async ([id, module]) => [id, await publicClient.readContract({ address: module.address, abi, functionName: "claimable", args: [selected] })] as const));
    setBalances(Object.fromEntries(reads));
    setOpen(true);
  };
  const withdraw = async (id: string, module: Address) => {
    if (!window.ethereum || !account) return;
    const client = createWalletClient({ chain: somnia, transport: custom(window.ethereum) });
    const hash = await client.writeContract({ address: module, abi, functionName: "withdraw", account });
    await publicClient.waitForTransactionReceipt({ hash });
    await load();
  };

  return <><button onClick={load} className="rounded-lg border border-cyan-200/20 px-3 py-2 text-xs text-cyan-100">Claims</button>
    {open && <div className="fixed inset-0 z-50 bg-black/70 p-4" onClick={() => setOpen(false)}><aside onClick={e => e.stopPropagation()} className="ml-auto h-full max-w-md overflow-auto rounded-2xl border border-cyan-200/20 bg-[#0b1113] p-5">
      <div className="flex justify-between"><h2 className="text-xl font-semibold text-white">Claimable balances</h2><button onClick={() => setOpen(false)}>Close</button></div>
      <p className="mt-2 break-all text-xs text-white/40">{account}</p>
      <div className="mt-5 space-y-2">{modules.map(([id, module]) => <div key={id} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><div><p className="text-sm text-white">{module.title}</p><p className="text-xs text-white/45">{formatEther(balances[id] ?? 0n)} STT</p></div><button disabled={!balances[id]} onClick={() => void withdraw(id, module.address)} className="text-sm text-cyan-200 disabled:opacity-30">Withdraw</button></div>)}</div>
    </aside></div>}</>;
}
