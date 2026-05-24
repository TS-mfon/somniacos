"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";

type ErrorStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  homeHref?: string;
};

export function ErrorState({ title, message, actionLabel = "Retry", onAction, homeHref = "/app" }: ErrorStateProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-obsidian bg-radial-grid px-5 text-mercury">
      <section className="panel max-w-2xl rounded-[2rem] p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-danger/30 bg-danger/10 text-danger">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-danger">System Guardrail</p>
        <h1 className="mt-3 font-display text-5xl text-white">{title}</h1>
        <p className="mt-4 text-base leading-7 text-white/62">{message}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onAction ? (
            <button onClick={onAction} className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-3 font-semibold text-black">
              <RefreshCw className="h-4 w-4" />
              {actionLabel}
            </button>
          ) : null}
          <Link href={homeHref} className="inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-3 text-white">
            <ArrowLeft className="h-4 w-4" />
            Return to command center
          </Link>
        </div>
      </section>
    </main>
  );
}

export function InlineError({ title, message }: { title: string; message: string }) {
  return (
    <div className="panel rounded-3xl border-danger/30 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-danger" />
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-white/58">{message}</p>
        </div>
      </div>
    </div>
  );
}
