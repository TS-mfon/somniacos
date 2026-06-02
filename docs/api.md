# SomniacOS HTTP API

All endpoints live under `apps/web/app/api/` and are deployed alongside the Next.js frontend. They run on the **Node.js runtime** (not Edge) because they use viem's full RPC surface. Responses are JSON.

The base URL in production is `https://somniacos.vercel.app`. The local development server mounts the same routes under `http://localhost:3000`.

---

## Conventions

- **Method.** All routes are `GET` unless explicitly noted.
- **Cache.** Every route exports `dynamic = "force-dynamic"`. No caching layer in front of the routes.
- **Error envelope.** On failure, routes return `{ ok: false, error: string, ...emptyDefaults }` with HTTP `>= 400`. Success envelopes carry `ok: true` and the payload.
- **Provenance.** Endpoints that pull from chain include a `source` field equal to `"contract"`, `"events"`, or `"defaults"` so the UI can label proof state. The OS endpoints also surface `configured: boolean` reflecting whether the OS kernel addresses are populated.
- **BigInts.** Block numbers, fees, and chain ids are returned as decimal strings to avoid JSON precision loss.

---

## `POST /api/agents/run`

Executes a curated SomniacOS agent. The route is shared by the Workbench's pre-signature LLM call (so the visitor sees a result immediately) and by post-signature retries that include the on-chain `requestId` / `txHash`.

### Request body

```ts
type RunRequest = {
  agentId: string;        // matches a curatedAgents[].id, e.g. "marketing-strategist"
  task: string;           // 1–2800 chars
  constraints?: string;   // 0–1600 chars
  urls?: string[];        // up to 3 http(s) URLs, fetched server-side for reference
  requestId?: string;     // Somnia Agents requestId (optional, for telemetry)
  txHash?: string;        // Somnia transaction hash (optional, for telemetry)
  missionId?: string;     // Workbench mission preset id (optional)
  outputFormat?:          // controls the system prompt's format instruction
    | "auto" | "x-post" | "thread" | "brief"
    | "audit" | "checklist" | "email" | "plan";
  memory?: {              // Workbench wallet-local memory
    projectName: string;
    audience: string;
    context: string;
    preferences: string;
    lastUpdated: string;
  };
};
```

### Behavior

1. Validates `agentId` against `curatedAgents` in `apps/web/lib/agent-engine.ts`. Unknown ids return `{ error: "Choose a valid SomniacOS agent." }` with status `400`.
2. Validates `task` (length 1–2800) and `constraints` (≤ 1600).
3. Fetches up to three referenced URLs (`fetchReferences`) with a 10-second per-URL timeout. HTML responses are stripped to plain text and clipped at 5000 characters.
4. Builds a system + user prompt. System prompt always includes the agent's `name`, `role`, `category`, and skill list, plus the per-format instruction (see table below).
5. Selects a provider:
   - If `OPENAI_API_KEY` is set: POSTs to `https://api.openai.com/v1/responses` with `model = OPENAI_MODEL ?? "gpt-4o-mini"`, `temperature = 0.55`, `max_output_tokens = 1200`. Provenance: `source: "LLM API"`, `provider: "openai"`.
   - Otherwise: GET `https://text.pollinations.ai/<encoded prompt>` with a 30-second timeout. Provenance: `source: "LLM API"`, `provider: "pollinations"`.
   - On provider failure: deterministic local responder `buildLocalAgentOutput`. Provenance: `source: "SomniacOS Local"`, `provider: "local-resilient-agent"`, plus `providerError`.
6. Computes `nextActions` and `handoffs` from the curated handoff graph (`agent-engine.ts → buildNextActions / buildAgentHandoffs`).

### Response

```ts
type RunResponse = {
  result: string;                              // final agent text
  source: "LLM API" | "SomniacOS Local";
  provider: "openai" | "pollinations" | "local-resilient-agent";
  providerError?: string;                      // only present on fallback
  outputFormat: OutputFormat;
  nextActions: { label: string; agentId: string; task: string; constraints: string; outputFormat: OutputFormat }[];
  handoffs:    { agentId: string; reason: string; task: string }[];
  memoryUpdates: string[];                     // suggested writes back to local memory
  references: { url: string; ok: boolean }[];  // status of each fetched URL
};
```

### Output format → instruction

| `outputFormat` | System-prompt instruction |
|----------------|---------------------------|
| `auto` | Choose the clearest structure for the task. |
| `x-post` | Return one polished X post under 280 characters plus one optional alternate. |
| `thread` | Return a concise X thread with numbered posts and a final call to action. |
| `brief` | Sections: Summary, Findings, Risks, Recommendation, Next steps. |
| `audit` | Sections: Findings, Severity, Evidence, Fixes, Missing tests. |
| `checklist` | Practical checklist with short action items. |
| `email` | Subject and Body, concise and ready to send. |
| `plan` | Phased plan with priorities, timeline, risks, and next agent handoffs. |

### Errors

| Status | Body | Cause |
|--------|------|-------|
| 400 | `Choose a valid SomniacOS agent.` | Unknown `agentId`. |
| 400 | `Enter a task for the agent.` | Empty `task`. |
| 400 | `Task is too long. Keep it under 2,800 characters.` | `task.length > 2800` |
| 400 | `Constraints are too long. Keep them under 1,600 characters.` | `constraints.length > 1600` |
| 502 | `The LLM provider returned an empty result.` | OpenAI returned an empty `output_text`. |
| 500 | provider error message | Any other failure surfaces from `Response.json({ error })`. |

---

## `GET /api/onchain/activity`

Returns the most recent decoded contract events from Somnia Shannon. This is the primary source for the landing page's live proof card, the agents listing, and the world feed reconstructions.

### Response

```ts
{
  ok: true,
  blockNumber: string,              // latest, as decimal string
  count: number,
  activity: Array<{
    contract: string,               // contract key (e.g. "AgentRegistry")
    address: `0x${string}`,
    eventName: string,              // e.g. "AgentCreated", "OSAgentRunCompleted"
    transactionHash: `0x${string}`,
    blockNumber: string,
    args: Record<string, string>    // decoded args, numerics as strings
  }>
}
```

The list is sorted newest-first. Internally the route also merges a curated set of seeded receipt hashes so that historically meaningful runs (e.g., the verified `content-writer` and `research-analyst` callbacks) remain visible after the live `getLogs` window scrolls past them.

### Error

`{ ok: false, error, activity: [] }` with status `500`.

---

## `GET /api/onchain/receipt?hash=0x…`

Thin proxy over `publicClient.getTransactionReceipt({ hash })`. Used by the Workbench's polling loop to wait for a freshly-signed transaction.

### Response

```ts
{
  ok: true,
  receipt: {
    transactionHash: `0x${string}`,
    blockNumber: string,
    status: "success" | "reverted"
  } | null
}
```

Returns `{ ok: true, receipt: null }` (HTTP 200) when the hash is not yet found, so callers can poll without treating "not yet mined" as an error.

### Error

`{ ok: false, error: "hash query parameter required" }` with status `400` when `?hash=` is missing.

---

## `GET /api/os/processes`

OS process index. Prefers direct `ProcessManager` reads (`processes(id)` for ids in `[1, nextProcessId)`, plus `steps(id, stepId)` for each registered step) and falls back to event reconstruction if no processes exist yet.

### Response

```ts
{
  ok: true,
  configured: boolean,
  source: "contract" | "events",
  processes: Array<{
    id: string,
    owner: `0x${string}`,
    goal: string,
    policyId: string,
    status: "Created" | "Running" | "WaitingForCallback" | "Completed" | "Failed" | "Cancelled",
    spent: string,                  // wei
    stepCount: string,
    createdAt: string,              // unix seconds
    updatedAt: string,
    feesPaid: string,               // formatted STT, e.g. "0.3400 STT"
    steps: Array<{
      id: string,
      capabilityId: `0x${string}`,
      appAgentId: string,
      somniaAgentId: string,
      requestId: string,
      mode: "LLM" | "Website" | "JSON",
      status: "Pending" | "Success" | "Failed" | "TimedOut",
      prompt: string,
      url: string,
      result: string,
      createdAt: string,
      completedAt: string
    }>
  }>
}
```

## `GET /api/os/processes/[id]`

Same shape, single `process` (or `null`).

---

## `GET /api/os/capabilities`

Returns the live `CapabilityRegistry` listing.

### Response

```ts
{
  ok: true,
  configured: boolean,
  source: "contract" | "events" | "defaults",
  capabilities: Array<{
    id: string,                     // schema-derived label (e.g. "content.write")
    label: string,
    mode: "LLM" | "Website" | "JSON",
    somniaAgentId: string,
    schemaURI: string,
    active: boolean
  }>
}
```

When the on-chain registry is unreachable, the route falls back to `defaultCapabilities` (mirrored in `apps/web/lib/os-state.ts`).

---

## `GET /api/os/revenue`

Combined event-derived totals with a direct `ProtocolFeeVault` read.

### Response

```ts
{
  ok: true,
  configured: boolean,
  revenue: {
    totalFees: string,        // formatted STT, e.g. "0.1000 STT"
    feeAmount: string,        // current per-action fee
    feeRecipient: `0x${string}`,
    eventCount: number,
    recent: Array<{
      payer: `0x${string}`,
      actionType: string,     // "policy.create" | "process.create" | "workflow.run" | "process.step"
      processId: string,
      stepId: string,
      amount: string,
      transactionHash: `0x${string}`,
      blockNumber: string
    }>
  }
}
```

---

## `GET /api/world`

Returns seeded world events used by SSR fallbacks and unit tests.

```ts
{ events: WorldEvent[]; generatedAt: string }
```

## `GET /api/economy`

Returns the seeded economy snapshot (`agents`, `organizations`, `negotiations`, `economyEdges`, `worldEvents`) from `@somniacos/shared`. Used as a UI fallback when chain reads are unavailable.

---

## Authentication

None. Every endpoint is unauthenticated and stateless. There is no rate limiter at the application layer; Vercel applies its standard per-function concurrency and burst limits.

## CORS

Endpoints are not configured for cross-origin browser callers. They are designed for first-party use by the dApp at the same origin.
