export type DocsSection = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  body: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
};

export const docsSections: DocsSection[] = [
  {
    slug: "overview",
    title: "Overview",
    eyebrow: "Autonomous economy",
    summary: "SomniacOS is an agentic economy interface on Somnia Shannon where users run specialist agents, structured missions, token launches, comparisons, and proof-backed workflows.",
    body: [
      {
        heading: "What SomniacOS does",
        paragraphs: [
          "SomniacOS turns AI work into a dApp-native operating flow. A visitor connects a wallet, chooses either a regular Workbench task or a structured Mission, signs the required transaction when proof or deployment is needed, and receives a visible agent result with receipts and recovery state.",
          "The product is intentionally not presented as a chatbot. It is organized around agents, missions, chain previews, receipts, saved context, and result confidence. The interface makes it clear which actions are ordinary API-backed agent runs and which actions are wallet-signed onchain operations."
        ],
        bullets: [
          "Workbench is for one-agent tasks.",
          "Missions are for structured workflows such as Launch Token.",
          "Compare lets users run the same task against multiple selected agents before choosing the best result.",
          "Receipts preserve proof metadata, result hashes, transaction links, and token artifacts."
        ]
      },
      {
        heading: "Why it matters for Somnia",
        paragraphs: [
          "Somnia's Agentic L1 thesis needs applications where agents are first-class actors, not decorative assistants. SomniacOS demonstrates this through curated agents, mission templates, capability routing, wallet-aware execution, and proof surfaces that make agent work inspectable."
        ]
      }
    ]
  },
  {
    slug: "workbench",
    title: "Workbench",
    eyebrow: "Regular agent tasks",
    summary: "Workbench is the clean single-agent execution surface for users who want useful outputs without navigating multi-agent mission controls.",
    body: [
      {
        heading: "User flow",
        paragraphs: [
          "A user opens Workbench, selects a specialist, writes a task, adds constraints, optionally provides URLs, chooses an output format, and clicks Run agent. The app validates the input, checks wallet/network state when needed, routes the task to the agent API, and displays the output directly on the page.",
          "Workbench excludes Token Launcher because token creation is not a casual task. Token deployment requires a structured mission, parameter review, wallet signing, and artifact capture."
        ],
        bullets: [
          "Supported agents include content, marketing, research, audit, security, treasury, governance, wallet risk, DeFi review, email, travel, study, career, meeting, and productivity.",
          "Saved context is passed into each run so users do not repeat project and preference details.",
          "Outputs show confidence scoring, proof links when available, handoffs, and next actions."
        ]
      }
    ]
  },
  {
    slug: "missions",
    title: "Missions",
    eyebrow: "Agent-to-agent workflows",
    summary: "Missions are structured workflows with templates, mission-specific input UI, chain previews, and receipt capture.",
    body: [
      {
        heading: "Mission model",
        paragraphs: [
          "A mission is a named workflow with a primary agent, task, constraints, output format, and optional steps. Steps can require an agent run, use previous output, or require a wallet action. This lets the dApp represent a real agent-to-agent workflow instead of a static page with generic fields.",
          "The Missions page changes its UI based on the selected mission. This is important for clarity: Launch Token shows token deployment inputs, while research or audit missions show task, constraints, URLs, and format controls."
        ],
        bullets: [
          "Launch Token: token parameter review, wallet deployment, token artifact, launch copy.",
          "Launch Crypto Project: strategy, research, and content chain.",
          "Token Due Diligence: balanced research without financial advice.",
          "Builder Audit: security-minded code and contract review.",
          "Wallet Safety: plain-English signing and dApp risk checklist."
        ]
      },
      {
        heading: "Agent chain preview",
        paragraphs: [
          "Before execution, Missions shows the planned chain. Each step lists the agent, task, whether it uses previous output, and whether it requires wallet signing. This makes the autonomous workflow understandable before the user commits."
        ]
      }
    ]
  },
  {
    slug: "launch-token",
    title: "Launch Token Mission",
    eyebrow: "Non-custodial deployment",
    summary: "Launch Token is a mission-only flow for deploying a fixed-supply Somnia testnet token through the deployed TokenFactory.",
    body: [
      {
        heading: "Why Launch Token is a mission",
        paragraphs: [
          "Token creation needs more structure than a normal agent prompt. The user must review parameters, understand the wallet action, sign a factory transaction, and receive a deploy artifact. For that reason, Launch Token lives in Missions, not Workbench.",
          "The agent prepares and validates the launch, but the user signs the deployment from their own wallet. SomniacOS never asks for seed phrases or private keys."
        ],
        bullets: [
          "Fields: name, symbol, decimals, initial supply, optional owner, metadata URI.",
          "Security Sentinel shows signer, factory, token params, owner, and private-key safety notice.",
          "After receipt confirmation, the app extracts TokenCreated and displays token address, owner, supply, deployer, metadata URI, and explorer link."
        ]
      }
    ]
  },
  {
    slug: "compare",
    title: "Compare",
    eyebrow: "Multi-agent evaluation",
    summary: "Compare runs the same task against selected agents, displays each output side-by-side, and helps the user decide which result is strongest.",
    body: [
      {
        heading: "How Compare works",
        paragraphs: [
          "The user chooses two or three agents, enters one task and constraints, then clicks Run selected agents. The page immediately creates running result cards for each chosen agent, calls the real agent API for each one, and replaces each card with the returned output as it completes.",
          "After all outputs return, the page ranks the results using confidence score and shows a simple comparison summary. This is intentionally API-backed; if the user wants onchain proof for the best result, they rerun that task in Workbench or Missions."
        ],
        bullets: [
          "Selected agents run against the same task for fair comparison.",
          "Each result shows status, output, confidence, source, and copy control.",
          "Compare sessions are saved locally for later review."
        ]
      }
    ]
  },
  {
    slug: "receipts",
    title: "Receipts",
    eyebrow: "Proof archive",
    summary: "Receipts package mission and run metadata into inspectable records with agent chain, tx hashes, result hashes, token artifacts, and timestamps.",
    body: [
      {
        heading: "Receipt contents",
        paragraphs: [
          "Receipts are generated locally from completed agent runs and token launches. They do not replace onchain proof; they organize it. A receipt references the chain through transaction hashes and preserves the context needed to understand what happened."
        ],
        bullets: [
          "Receipt ID, mission ID, mission label, user wallet, chain ID.",
          "Agent chain and step outputs.",
          "Transaction hashes and explorer links.",
          "Token address and token artifact details when a token is deployed.",
          "Result hash and timestamp."
        ]
      }
    ]
  },
  {
    slug: "agents",
    title: "Agent Profiles",
    eyebrow: "Specialist workers",
    summary: "Each curated agent has a public profile with role, skills, examples, capability mapping, compatible missions, and a direct action path.",
    body: [
      {
        heading: "Profile purpose",
        paragraphs: [
          "Public profiles make agents feel like real system components. Users can inspect what each agent is good at, see example tasks, understand compatible missions, and open the correct execution surface."
        ],
        bullets: [
          "Normal agents open Workbench.",
          "Token Launcher opens Launch Token mission.",
          "Compatible missions are derived from mission steps."
        ]
      }
    ]
  },
  {
    slug: "security",
    title: "Security And Error Recovery",
    eyebrow: "User safety",
    summary: "SomniacOS uses explicit review steps, non-custodial wallet signing, and plain-English recovery messages to keep users safe.",
    body: [
      {
        heading: "Safety model",
        paragraphs: [
          "Users keep custody of their wallet. The app prepares transactions, estimates gas, and explains actions through Security Sentinel, but the wallet is the signer. The dApp never requests private keys or seed phrases.",
          "Errors are translated into actionable recovery instructions rather than raw RPC output. This is essential for zero-knowledge users."
        ],
        bullets: [
          "No wallet: install or unlock MetaMask, Rabby, Brave, or Coinbase Wallet.",
          "Wrong network: approve or manually switch to Somnia Shannon.",
          "Insufficient STT: fund gas and agent fees, then retry.",
          "Gas estimation issue: switch away and back to Somnia, then retry.",
          "Pending callback: check History or wait for recovery."
        ]
      }
    ]
  },
  {
    slug: "developer",
    title: "Developer Reference",
    eyebrow: "Technical architecture",
    summary: "The dApp is a Next.js application backed by Somnia contracts, the agent API route, local proof stores, and Vercel deployment.",
    body: [
      {
        heading: "Key implementation pieces",
        paragraphs: [
          "The web app lives in `apps/web`. Agent definitions, missions, confidence scoring, and receipt types live in `apps/web/lib/agent-engine.ts`. Local history, proof receipts, mission receipts, and compare sessions are managed by `apps/web/lib/history-store.ts`.",
          "The agent API is `/api/agents/run`. It accepts agent id, task, constraints, URLs, mission id, output format, memory, request id, and transaction hash. It is strict by default and never returns deterministic mock output. Workbench and Missions treat the paid Somnia Agent callback as the authoritative result."
        ],
        bullets: [
          "Somnia Shannon chain ID: 50312.",
          "Router: SomniacAgentRouterV2.",
          "Token deployment: SomniacTokenFactory.",
          "Frontend deployment: Vercel production alias `somniacos.vercel.app`."
        ]
      }
    ]
  }
];

export function getDocsSection(slug: string) {
  return docsSections.find((section) => section.slug === slug);
}
