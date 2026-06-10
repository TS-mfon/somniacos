"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  http,
  parseEther,
  type Address,
} from "viem";
import { Bot, Loader2, Sparkles, Wallet } from "lucide-react";
import { somnia } from "../../lib/contracts";
import {
  bufferedGas,
  detectWalletKind,
  estimateGasFees,
  gasCeiling,
  pickPricingForWallet,
  pricingArgs,
} from "../../lib/somnia-gas";
import { useSomniaWallet } from "../wallet-button";
import { useNotifications } from "../notification-center";
import { contentCodeSkillsAbi, decodeDraftRequestId, waitForDraftResult } from "../../lib/agents/dispatcher";
import { skillRegistry, type SkillMeta } from "../../lib/agents/skill-registry";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });

type Phase = "idle" | "wallet" | "signature" | "pending" | "resolved" | "error";

export function SkillsClient({ skillId }: { skillId: string }) {
  const skill = useMemo(() => skillRegistry.find((entry) => entry.id === skillId) ?? skillRegistry[0], [skillId]);
  const { wallet, connect, switchToSomnia, walletClient, refresh } = useSomniaWallet();
  const notify = useNotifications();

  const [values, setValues] = useState<Record<string, string>>(() => initialValues(skill));
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [requestId, setRequestId] = useState<bigint | null>(null);
  const [callPrice, setCallPrice] = useState<bigint | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setValues(initialValues(skill));
    setPhase("idle");
    setResult("");
    setError("");
    setRequestId(null);
  }, [skill]);

  useEffect(() => {
    let cancelled = false;
    publicClient
      .readContract({ address: skill.module, abi: contentCodeSkillsAbi, functionName: "callPrice" })
      .then((price) => {
        if (!cancelled) setCallPrice(price as bigint);
      })
      .catch(() => {
        if (!cancelled) setCallPrice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [skill.module]);

  const busy = phase === "wallet" || phase === "signature" || phase === "pending";

  async function ensureWalletReady(): Promise<Address> {
    if (!window.ethereum) throw new Error("No injected wallet found. Install MetaMask, Rabby, Brave Wallet, or Coinbase Wallet.");
    let accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
    if (!accounts[0]) {
      await connect();
      accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
    }
    const chain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    if (Number.parseInt(chain, 16) !== somnia.id) await switchToSomnia();
    return accounts[0];
  }

  async function run() {
    setError("");
    setResult("");
    setRequestId(null);
    setElapsed(0);
    try {
      validate(skill, values);
      setPhase("wallet");
      setStatus("Checking wallet and skill price");
      const account = await ensureWalletReady();

      const price = (await publicClient.readContract({
        address: skill.module,
        abi: contentCodeSkillsAbi,
        functionName: "callPrice",
      })) as bigint;
      setCallPrice(price);
      if (wallet.balance && parseEther(wallet.balance) < price) {
        throw new Error(`Insufficient STT. This skill needs ${formatEther(price)} STT plus gas.`);
      }

      const args = skill.fields.map((field) => values[field.name].trim());
      const data = encodeFunctionData({ abi: contentCodeSkillsAbi, functionName: "draft", args: args as [string, string, string] });
      const transaction = { account, to: skill.module, value: price, data } as const;

      setPhase("signature");
      setStatus("Estimating gas and opening your wallet");
      const gas = bufferedGas(await publicClient.estimateGas(transaction));
      const pricing = pickPricingForWallet(await estimateGasFees(publicClient), detectWalletKind(window.ethereum));
      const totalGasCost = gas * gasCeiling(pricing);
      if (wallet.balance && parseEther(wallet.balance) < price + totalGasCost) {
        throw new Error(`Insufficient STT. This skill needs ~${formatEther(price + totalGasCost)} STT (fee + gas).`);
      }
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const nonce = await publicClient.getTransactionCount({ address: account, blockTag: "pending" });
      const hash = await client.sendTransaction({ ...transaction, gas, nonce, ...pricingArgs(pricing) });

      setPhase("pending");
      setStatus("Skill submitted. Waiting for the Somnia validator inference.");
      notify.push({
        kind: "tx",
        title: `${skill.name} request submitted`,
        body: "Running on real Somnia validators. You'll be notified the moment it resolves.",
        link: { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" },
        silent: true,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Somnia transaction reverted.");

      const id = decodeDraftRequestId(receipt.logs as never, skill.module);
      if (id === null) throw new Error("Could not read the request id from the transaction logs.");
      setRequestId(id);
      setStatus(`Request #${id} accepted by the platform. Waiting for the inference callback.`);

      const text = await waitForDraftResult({
        client: publicClient,
        module: skill.module,
        requestId: id,
        onTick: (ms) => setElapsed(Math.round(ms / 1000)),
      });

      setResult(text);
      setPhase("resolved");
      setStatus("Resolved on-chain.");
      void refresh();
      notify.push({ kind: "result", title: `${skill.name} resolved`, body: text.slice(0, 140) });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Skill execution failed.";
      setError(message);
      setPhase("error");
      notify.push({ kind: "error", title: `${skill.name} failed`, body: message });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">{skill.category}</p>
        <h2 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-white">
          <Sparkles className="h-7 w-7 text-cyan-300" /> {skill.name}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/60">{skill.description}</p>

        <div className="mt-6 space-y-4">
          {skill.fields.map((field) => (
            <div key={field.name}>
              <label className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">{field.label}</label>
              {field.type === "select" ? (
                <select
                  value={values[field.name]}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-signal/40"
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.rows ? (
                <textarea
                  value={values[field.name]}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  placeholder={field.placeholder}
                  rows={field.rows}
                  disabled={busy}
                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-signal/40"
                />
              ) : (
                <input
                  value={values[field.name]}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  placeholder={field.placeholder}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-signal/40"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={run}
          disabled={busy}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          {busy ? "Running on Somnia…" : wallet.address ? "Run skill" : "Connect wallet & run"}
        </button>

        {phase !== "idle" && phase !== "resolved" && phase !== "error" ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            {status}
            {phase === "pending" && elapsed > 0 ? <span className="text-white/35"> · {elapsed}s</span> : null}
          </p>
        ) : null}

        {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-300">{error}</p> : null}

        {result ? (
          <div className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.04] p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/80">Resolved output</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/85">{result}</p>
            {requestId !== null ? <p className="mt-3 font-mono text-[11px] text-white/35">request #{requestId.toString()} · verified on-chain</p> : null}
          </div>
        ) : null}
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Live pricing</p>
          <p className="mt-3 text-3xl font-semibold text-white">{callPrice !== null ? `${formatEther(callPrice)} STT` : "…"}</p>
          <p className="mt-1 text-xs leading-5 text-white/45">Protocol fee + Somnia validator deposit, read live from the deployed module.</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-white/55">
            <Wallet className="h-4 w-4 text-white/35" />
            {wallet.address ? `${wallet.balance ? Number(wallet.balance).toFixed(3) : "0"} STT` : "Wallet not connected"}
          </div>
        </div>
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">How it runs</p>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-white/55">
            <li>1. You call <code className="text-cyan-300">{skill.functionName}()</code> with {formatEther(callPrice ?? 0n)} STT.</li>
            <li>2. The module pays the protocol fee and dispatches to the Somnia Agents Platform.</li>
            <li>3. The validator subcommittee runs the inference (~{skill.estimatedLatencySeconds}s).</li>
            <li>4. The callback resolves <code className="text-cyan-300">{skill.resolvedEventName}</code> on-chain.</li>
          </ol>
          <p className="mt-4 break-all font-mono text-[11px] text-white/30">module {skill.module}</p>
        </div>
      </aside>
    </div>
  );
}

function initialValues(skill: SkillMeta): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of skill.fields) {
    values[field.name] = field.type === "select" ? field.options[0].value : "";
  }
  return values;
}

function validate(skill: SkillMeta, values: Record<string, string>) {
  for (const field of skill.fields) {
    const value = values[field.name]?.trim() ?? "";
    if (!value) throw new Error(`Enter a value for ${field.label}.`);
    if (field.name === "topic" && value.length >= 280) throw new Error("Topic must be under 280 characters.");
  }
}
