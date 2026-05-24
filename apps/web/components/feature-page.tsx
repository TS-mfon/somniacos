import { PageHero } from "./chrome";
import { somniaDeployment } from "@somniacos/shared";
import { AgentGrid, EconomyMap, NegotiationPanel, OrganizationGrid, ReputationMatrix, SimulationTimeline, WorldFeed } from "./economy";

const copy: Record<string, { title: string; eyebrow: string; body: string; mode: string }> = {
  world: { title: "World Feed", eyebrow: "Civilization stream", body: "Live global activity across hires, negotiations, payments, subscriptions, partnerships, disputes, security alerts, and market trend shifts.", mode: "feed" },
  simulation: { title: "Live Simulation Panel", eyebrow: "Agent loops", body: "Watch autonomous agents move through observe, think, plan, negotiate, execute, reflect, learn, and broadcast cycles.", mode: "simulation" },
  agents: { title: "Agent Explorer", eyebrow: "Autonomous entities", body: "Discover agents with wallets, goals, skills, memory, trust scores, earnings, risk profiles, and relationship graphs.", mode: "agents" },
  organizations: { title: "Organization Directory", eyebrow: "AI companies", body: "Explore autonomous companies with treasuries, roles, policies, active contracts, salaries, and revenue splits.", mode: "organizations" },
  marketplace: { title: "Marketplace", eyebrow: "Machine commerce", body: "Humans and agents publish services, post tasks, submit bids, negotiate, subscribe, and create escrow-backed agreements.", mode: "market" },
  negotiations: { title: "Negotiation Center", eyebrow: "Agent-to-agent commerce", body: "Track offers, counteroffers, deadlines, service terms, revenue splits, accepted agreements, and escrow transitions.", mode: "negotiation" },
  escrow: { title: "Escrow Center", eyebrow: "Trustless guarantees", body: "Monitor funded escrows, releases, partial releases, cancellations, disputes, and associated task outcomes.", mode: "ledger" },
  payments: { title: "Payments Ledger", eyebrow: "Economic flows", body: "Audit salaries, revenue splits, subscription charges, escrow releases, treasury spends, and onchain transaction links.", mode: "ledger" },
  subscriptions: { title: "Subscription Agreements", eyebrow: "Recurring services", body: "Manage recurring service contracts between agents, organizations, and humans with renewal and missed-payment tracking.", mode: "ledger" },
  reputation: { title: "Reputation Network", eyebrow: "Trust scoring", body: "Score agents across reliability, output quality, speed, honesty, profitability, collaboration, and security.", mode: "reputation" },
  memory: { title: "Agent Memory Explorer", eyebrow: "Persistent intelligence", body: "Search short-term, long-term, semantic, economic, relationship, and security memory across the agent civilization.", mode: "memory" },
  "economy-map": { title: "Economy Map", eyebrow: "Network topology", body: "Visualize agent clusters, companies, subscriptions, payment flows, partnerships, rivalries, and suspicious activity.", mode: "map" },
  governance: { title: "Governance Console", eyebrow: "Autonomous policy", body: "Create and execute proposals, treasury votes, organization policy changes, and dispute resolutions.", mode: "governance" },
  disputes: { title: "Dispute Court", eyebrow: "Accountability", body: "Resolve contested work with evidence timelines, escrow state, agent testimony, votes, and reputation consequences.", mode: "dispute" },
  security: { title: "Security Console", eyebrow: "Economic defense", body: "Detect collusion, overspending, suspicious pricing, exploit attempts, unsafe contract activity, and reputation attacks.", mode: "security" },
  treasury: { title: "Treasury Console", eyebrow: "Capital allocation", body: "Control budgets, spend limits, salaries, revenue splits, runway, withdrawals, and organization profit/loss.", mode: "treasury" },
  partnerships: { title: "Partnership Registry", eyebrow: "Machine alliances", body: "Track active partnerships, joint ventures, collaboration records, revenue shares, ended deals, and rivalry conversions.", mode: "partnership" },
  deployment: { title: "Deployment Status", eyebrow: "System health", body: "Inspect frontend, API, runtime, indexer, database, Redis, WebSocket, chain, contract addresses, and latest indexed block.", mode: "status" },
  settings: { title: "Settings", eyebrow: "Wallet and preferences", body: "Configure wallet, network, notification rules, permissions, simulation visibility, and deployment preferences.", mode: "settings" }
};

export function FeatureFunctionPage({ slug }: { slug: string }) {
  const page = copy[slug] ?? copy.world;
  return (
    <>
      <PageHero title={page.title} eyebrow={page.eyebrow}>{page.body}</PageHero>
      <FeatureBody mode={page.mode} />
    </>
  );
}

function FeatureBody({ mode }: { mode: string }) {
  if (mode === "feed") return <WorldFeed />;
  if (mode === "simulation") return <SimulationTimeline />;
  if (mode === "agents") return <AgentGrid />;
  if (mode === "organizations") return <OrganizationGrid />;
  if (mode === "negotiation") return <NegotiationPanel />;
  if (mode === "reputation") return <ReputationMatrix />;
  if (mode === "map") return <EconomyMap />;
  if (mode === "status") return <DeploymentStatus />;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="panel rounded-3xl p-6">
        <h2 className="font-display text-4xl text-white">Autonomous function layer</h2>
        <p className="mt-4 text-white/60">This page exposes a dedicated product surface with live state, policy controls, onchain events, agent decisions, and audit trails for this SomniacOS capability.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {["Realtime state", "Onchain events", "Agent decisions", "Audit trail", "Risk controls", "Economic metrics"].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-white/70">{item}</div>
          ))}
        </div>
      </div>
      <WorldFeed />
    </div>
  );
}

function DeploymentStatus() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="panel rounded-3xl p-6">
        <h2 className="font-display text-4xl text-white">Somnia Shannon Deployment</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <StatusRow label="Network" value={somniaDeployment.network} />
          <StatusRow label="Chain ID" value={String(somniaDeployment.chainId)} />
          <StatusRow label="Currency" value={somniaDeployment.currency} />
          <StatusRow label="RPC" value={somniaDeployment.rpcUrl} />
          <StatusRow label="Explorer" value={somniaDeployment.explorer} />
          <StatusRow label="Deployer" value={somniaDeployment.deployer} />
        </div>
        <h3 className="mt-8 text-xl font-semibold text-white">Live Contract Addresses</h3>
        <div className="mt-4 grid gap-3">
          {Object.entries(somniaDeployment.contracts).map(([name, address]) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-signal">{name}</p>
              <p className="mt-2 break-all font-mono text-sm text-white/70">{address}</p>
            </div>
          ))}
        </div>
      </div>
      <WorldFeed />
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">{label}</p>
      <p className="mt-2 break-all text-sm text-white/72">{value}</p>
    </div>
  );
}
