import Link from "next/link";
import { PageHero } from "../../../components/chrome";
import { extensionContracts, osContracts, somnia } from "../../../lib/contracts";

const sections = [
  {
    title: "What SomniacOS is",
    body: "SomniacOS is an agentic economy interface on Somnia Shannon. Visitors connect a wallet, run specialist agents, launch structured missions, pay the combined Somnia agent fee plus protocol fee in one transaction, and receive visible outputs with receipts."
  },
  {
    title: "Workbench",
    body: "Workbench is for regular one-agent tasks. Use it for writing, research, code auditing, wallet safety checklists, strategy, productivity planning, emails, and transaction explanations. It stays clean by excluding token launch and multi-agent mission controls."
  },
  {
    title: "Missions",
    body: "Missions are structured workflows. Each mission has a template, a selected primary agent, optional multi-agent steps, a chain preview, and mission-specific inputs. Launch Token is a mission because it includes parameter review, wallet signing, deployment proof, and post-launch output."
  },
  {
    title: "Launch Token",
    body: "The Launch Token mission never asks for a private key. The agent validates token parameters, the Security Sentinel explains the action, and the connected wallet signs a token factory transaction. After receipt confirmation, SomniacOS displays token address, owner, supply, and explorer link."
  },
  {
    title: "Compare",
    body: "Compare runs one prompt through multiple specialist agents using the real agent API. It helps users choose the strongest output before they create an onchain proof run. Compare sessions are saved locally."
  },
  {
    title: "Receipts",
    body: "Receipts preserve proof metadata for missions and agent runs: mission id, agent chain, tx hashes, result hash, token address when applicable, fee metadata, chain id, and timestamp."
  },
  {
    title: "Confidence score",
    body: "Confidence is an output-quality score, not a claim that the content is factually guaranteed. It considers task clarity, constraints, source mode, result detail, output format alignment, and fallback language."
  },
  {
    title: "Saved context",
    body: "Users can save project, audience, industry, tone, risk tolerance, wallet experience, common links, preferences, and do-not-do rules. Agents receive this context across Workbench, Missions, and Compare."
  },
  {
    title: "Error recovery",
    body: "Errors are translated into plain-English next steps: install wallet, approve network switch, fund STT, retry gas estimation, fix URLs, wait for callbacks, or correct token fields."
  }
];

export default function DocsPage() {
  return (
    <>
      <PageHero title="Docs" eyebrow="SomniacOS guide">Comprehensive user, judge, and developer documentation for the autonomous economy layer.</PageHero>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="panel rounded-[1.5rem] p-5 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{section.title}</p>
              <p className="mt-3 text-sm leading-7 text-white/62">{section.body}</p>
            </article>
          ))}
        </section>
        <aside className="space-y-4">
          <div className="panel rounded-[1.5rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Quick actions</p>
            <div className="mt-4 grid gap-2">
              <Link href="/app/agent-workbench" className="rounded-xl border border-white/10 bg-[#101010] p-3 text-sm text-white/62 hover:border-signal/35">Run a regular agent</Link>
              <Link href="/app/missions?mission=launch-token" className="rounded-xl border border-white/10 bg-[#101010] p-3 text-sm text-white/62 hover:border-signal/35">Open Launch Token mission</Link>
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
              <p><span className="text-white">Functionality:</span> deployed dApp, wallet flow, agent API, token factory, receipts.</p>
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
