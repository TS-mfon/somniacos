# SomniacOS HTTP API

The Next.js routes under `apps/web/app/api/` provide read-only Somnia RPC access and product discovery. They never perform LLM inference, fetch reference websites, or sign transactions for visitors.

## Conventions

- Successful responses use `{ ok: true, ...payload }`.
- Failed responses use `{ ok: false, error: { code, message, action, retryable, technical? } }`.
- Onchain numeric values are serialized as decimal strings.
- Write and inference flows require a wallet-signed Somnia Shannon transaction.

## `POST /api/agents/run`

This compatibility endpoint does not execute an agent. It returns HTTP `409`:

```json
{
  "ok": false,
  "error": {
    "code": "SOMNIA_TRANSACTION_REQUIRED",
    "message": "Agent execution requires a wallet-signed Somnia Shannon transaction.",
    "action": "Submit through the Workbench and wait for the onchain Somnia callback.",
    "retryable": false
  },
  "chainId": 50312
}
```

The browser submits the task and any reference URL to the deployed router. LLM inference and Website parsing are performed by the Somnia Agents Platform and returned through an authenticated onchain callback.

## `GET /api/agents/catalog`

Returns curated agents, missions, output formats, and the Somnia transaction requirement:

```ts
{
  agents: CuratedAgent[];
  missions: AgentMission[];
  outputFormats: OutputFormat[];
  invocation: {
    execution: "somnia-transaction-required";
    route: "/app/agent-workbench";
    chainId: 50312;
    callbackSource: "Somnia Agents Platform";
  };
}
```

## `GET /api/onchain/activity`

Returns decoded Somnia Shannon events and the latest block number.

## `GET /api/onchain/receipt?hash=0x...`

Returns a transaction receipt. A valid hash that is not mined yet returns `{ ok: true, receipt: null }`. Invalid hashes and RPC failures return the structured error envelope.

## OS Read Endpoints

- `GET /api/os/processes`
- `GET /api/os/processes/[id]`
- `GET /api/os/capabilities`
- `GET /api/os/revenue`

These endpoints prefer direct contract reads and may use decoded events when appropriate. They do not mutate chain state.

## Fixture Endpoints

- `GET /api/world`
- `GET /api/economy`

These return explicitly labeled design fixtures for development and tests. They are not presented as live economic state in the public app.

## Authentication And Writes

Read endpoints are unauthenticated. Visitor writes are authorized only by the visitor's connected wallet; the application server has no visitor transaction hot wallet.
