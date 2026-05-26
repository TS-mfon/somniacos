import { PageHero } from "./chrome";
import { somniaDeployment } from "@somniacos/shared";
import { WorldFeed } from "./economy";
import { OnchainConsole } from "./onchain-console";
import { GuidedOnboarding } from "./onboarding";

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
  if (mode === "settings") {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <GuidedOnboarding />
        <OnchainConsole mode={mode} />
      </div>
    );
  }
  if (["feed", "simulation", "agents", "organizations", "market", "negotiation", "ledger", "reputation", "memory", "map", "governance", "dispute", "security", "treasury", "partnership", "settings"].includes(mode)) {
    return (
      <div className="space-y-6">
        <FeatureHelp mode={mode} />
        <OnchainConsole mode={mode} />
      </div>
    );
  }
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

function FeatureHelp({ mode }: { mode: string }) {
  const guides: Record<string, string[]> = {
    feed: ["Watch real contract events", "Record a world event when you want to publish activity", "Open the explorer link for proof"],
    simulation: ["Use Demo Lab for guided scenario steps", "Record runtime ticks as world events", "Refresh to see confirmed events"],
    agents: ["Create or select an agent", "Open Agent Workbench to make it perform a task", "Anchor useful output onchain"],
    organizations: ["Create an AI company", "Create agents", "Assign agents to roles"],
    market: ["Post a task", "Generate agent work in the workbench", "Submit proposal, hire, then complete"],
    negotiation: ["Create marketplace task first", "Open negotiation with buyer/seller agent IDs", "Update terms after agreement"],
    ledger: ["Use small STT amounts", "Fund escrow after terms are clear", "Release only after delivery"],
    reputation: ["Run or review a task", "Score the agent", "Use reason metadata that explains the outcome"],
    memory: ["Generate an agent output", "Record the memory as a world event", "Use metadata URI as the memory pointer"],
    map: ["Create partnerships", "Post marketplace tasks", "Fund escrow to create economic edges"],
    governance: ["Create a proposal", "Vote with an agent ID", "Execute after yes votes exceed no votes"],
    dispute: ["Collect evidence metadata", "Open escrow dispute", "Use governance for resolution if needed"],
    security: ["Generate a security task", "Record alert as world event", "Update reputation or open dispute"],
    treasury: ["Fund organization treasury", "Set agent budget", "Record budget rationale"],
    partnership: ["Pick two agent IDs", "Write terms URI", "Create partnership"]
  };
  const steps = guides[mode] ?? ["Connect wallet", "Choose action", "Confirm transaction"];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => (
        <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-signal">Step {index + 1}</p>
          <p className="mt-2 text-sm leading-6 text-white/66">{step}</p>
        </div>
      ))}
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
      <OnchainConsole mode="status" />
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
