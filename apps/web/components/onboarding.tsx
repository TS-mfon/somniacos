"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Fuel, MousePointer2, WalletCards, Zap } from "lucide-react";
import { useSomniaWallet } from "./wallet-button";
import { somnia } from "../lib/contracts";

export function GuidedOnboarding({ compact = false }: { compact?: boolean }) {
  const { wallet, connect, switchToSomnia } = useSomniaWallet();
  const hasWallet = !!wallet.address;
  const rightNetwork = wallet.chainId === somnia.id;
  const hasBalance = Number(wallet.balance ?? 0) > 0;

  const steps = [
    { done: hasWallet, icon: <WalletCards className="h-4 w-4" />, title: "Connect wallet", body: "Use MetaMask, Rabby, Brave, or Coinbase Wallet.", action: hasWallet ? "Connected" : "Connect", onClick: connect },
    { done: rightNetwork, icon: <Zap className="h-4 w-4" />, title: "Switch to Somnia", body: "The app will add Somnia Shannon if your wallet does not have it.", action: rightNetwork ? "Ready" : "Switch", onClick: switchToSomnia },
    { done: hasBalance, icon: <Fuel className="h-4 w-4" />, title: "Fund STT", body: "You need testnet STT for gas and escrow actions.", action: hasBalance ? `${Number(wallet.balance).toFixed(3)} STT` : "Get STT", href: "https://testnet.somnia.network/" },
    { done: false, icon: <MousePointer2 className="h-4 w-4" />, title: "Run an agent", body: "Use the workbench to make an agent perform a task, then anchor the result onchain.", action: "Open workbench", href: "/app/agent-workbench" }
  ];

  return (
    <section className={`hero-panel rounded-[2rem] ${compact ? "p-4" : "p-6"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-signal">Zero-knowledge start</p>
          <h2 className={`${compact ? "text-3xl" : "text-4xl"} mt-2 font-display text-white`}>Use SomniacOS in four steps.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">You do not need to understand contracts. Connect a wallet, switch network, get STT, then ask an agent to do work.</p>
        </div>
        <Link href="/app/demo-lab" className="rounded-full border border-signal/30 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">Guided demo</Link>
      </div>
      <div className={`mt-5 grid gap-3 ${compact ? "" : "md:grid-cols-4"}`}>
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={step.done ? "text-signal" : "text-cobalt"}>{step.done ? <CheckCircle2 className="h-4 w-4" /> : step.icon}</span>
              {step.href ? (
                step.href.startsWith("http") ? <a href={step.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cobalt">{step.action}<ExternalLink className="h-3 w-3" /></a> : <Link href={step.href} className="text-xs text-cobalt">{step.action}</Link>
              ) : (
                <button onClick={step.onClick} className="text-xs text-cobalt">{step.action}</button>
              )}
            </div>
            <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-xs leading-5 text-white/50">{step.body}</p>
          </div>
        ))}
      </div>
      {wallet.error ? <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{wallet.error}</p> : null}
    </section>
  );
}
