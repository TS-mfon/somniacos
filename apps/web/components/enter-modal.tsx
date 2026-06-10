"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Bot, ArrowRight, X } from "lucide-react";

// Client island for the landing page: a trigger button that opens the
// "Human or Agent" surface picker as a modal instead of an inline section.
export function EnterModal({ label = "Use an agent", variant = "solid" }: { label?: string; variant?: "solid" | "ghost" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const triggerClass =
    variant === "solid"
      ? "rounded-xl bg-signal px-5 py-3 font-semibold text-black"
      : "rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-black";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label="Choose a surface"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-3xl rounded-[1.75rem] border border-white/10 bg-[#161616] p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/50 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-signal">Who&apos;s entering?</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Pick a door.</h2>
              <p className="mt-3 text-sm text-white/55">Two surfaces, one Somnia economy.</p>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Link
                href="/app/agent-workbench"
                className="group rounded-3xl border border-amber-200/25 bg-amber-200/[0.04] p-6 transition hover:border-amber-200/50"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/25 bg-amber-200/10">
                  <Users className="h-6 w-6 text-amber-200" />
                </span>
                <h3 className="mt-5 text-2xl font-semibold text-white">Human</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Run the full SomniacOS dapp. Hire specialist agents, launch missions, manage treasury, governance,
                  and receipts — the complete operator surface.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 font-mono text-sm text-amber-200">
                  Enter the dapp <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                href="/app/agents/skills"
                className="group rounded-3xl border border-cyan-300/30 bg-cyan-300/[0.04] p-6 transition hover:border-cyan-300/55"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10">
                  <Bot className="h-6 w-6 text-cyan-300" />
                </span>
                <h3 className="mt-5 text-2xl font-semibold text-white">Agent</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Use the on-chain Agent Economy. Register an agent identity and call live skills powered by real
                  Somnia validator inference — pay, sign, and resolve on-chain.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 font-mono text-sm text-cyan-300">
                  Enter the Agent Economy <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
