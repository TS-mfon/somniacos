import Link from "next/link";
import { PageHero } from "../../../components/chrome";
import { docsSections } from "../../../lib/docs-content";
import { extensionContracts, osContracts, somnia } from "../../../lib/contracts";

export default function DocsPage() {
  return (
    <>
      <PageHero title="Docs" eyebrow="SomniacOS guide">Detailed user, judge, and developer documentation split into focused sections.</PageHero>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-4 md:grid-cols-2">
          {docsSections.map((section) => (
            <Link key={section.slug} href={`/app/docs/${section.slug}`} className="panel rounded-[1.5rem] p-5 transition hover:border-signal/35 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{section.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/58">{section.summary}</p>
              <span className="mt-5 inline-flex rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/62">Read section</span>
            </Link>
          ))}
        </section>
        <aside className="space-y-4">
          <div className="panel rounded-[1.5rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Fast paths</p>
            <div className="mt-4 grid gap-2">
              <Link href="/app/agent-workbench" className="rounded-xl border border-white/10 bg-[#101010] p-3 text-sm text-white/62 hover:border-signal/35">Run a regular agent</Link>
              <Link href="/app/missions?mission=launch-token" className="rounded-xl border border-white/10 bg-[#101010] p-3 text-sm text-white/62 hover:border-signal/35">Open Launch Token mission</Link>
              <Link href="/app/compare" className="rounded-xl border border-white/10 bg-[#101010] p-3 text-sm text-white/62 hover:border-signal/35">Compare agent results</Link>
              <Link href="/app/receipts" className="rounded-xl border border-white/10 bg-[#101010] p-3 text-sm text-white/62 hover:border-signal/35">Inspect receipts</Link>
            </div>
          </div>
          <div className="panel rounded-[1.5rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Somnia Shannon</p>
            <p className="mt-3 text-sm text-white/55">Chain ID: {somnia.id}</p>
            <p className="mt-2 break-all text-sm text-white/55">RPC: {somnia.rpcUrls.default.http[0]}</p>
            <p className="mt-2 break-all text-sm text-white/55">Router: {osContracts.SomniacAgentRouterV2}</p>
            <p className="mt-2 break-all text-sm text-white/55">Token Factory: {extensionContracts.SomniacTokenFactory}</p>
          </div>
          <div className="panel rounded-[1.5rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Judging criteria</p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-white/55">
              <p><span className="text-white">Functionality:</span> deployed app, wallet flow, agent API, token factory, receipts.</p>
              <p><span className="text-white">Agent-first:</span> specialist agents, mission templates, chain previews, handoffs.</p>
              <p><span className="text-white">Innovation:</span> autonomous economy UX, proof receipts, token mission flow.</p>
              <p><span className="text-white">Autonomous performance:</span> recoverable runs, saved context, confidence scoring, error handling.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
