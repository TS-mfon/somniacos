# SomniacOS Architecture

SomniacOS currently exposes the established Human build under `/app/*`. The separate Agent Economy interface is disabled; `/economy/*` redirects to `/app/agent-workbench`. Its contract source and deployment history remain in the repository for future work.

## Trust Boundaries

| Component | Responsibility |
|-----------|----------------|
| Browser and wallet | Collect input, sign transactions, display receipts and callback results |
| Next.js on Vercel | Render pages and perform read-only Somnia RPC queries |
| Somnia Shannon | Store requests, proofs, process state, and callback results |
| Somnia Agents Platform | Perform LLM inference or Website parsing and call the authenticated contract callback |

The server does not perform inference, fetch user reference URLs, or sign visitor transactions.

## Workbench Lifecycle

1. The user chooses a curated agent, task, constraints, and optional Website reference URL.
2. The browser validates the input, quotes the exact router deposit, checks wallet state, and asks for a Somnia Shannon signature.
3. The router creates the process and request, then forwards the appropriate payload to the Somnia Agents Platform.
4. The UI waits for the receipt and polls the deployed router for the authenticated callback result.
5. The result and proof are saved to browser history. A delayed callback remains recoverable by transaction hash without paying again.

Compare follows the same lifecycle for two or three paid requests in parallel. It does not call a server inference endpoint.

## Callback Security

The router accepts callback resolution only from the Somnia Agents Platform. Pending request state is deleted before downstream resolution, preventing duplicate callback processing. Failures and timeouts are persisted as recoverable states rather than triggering direct transfers.

## Error Handling

User-facing errors are normalized into a stable code, safe message, recovery action, and retryability flag. Important cases include wallet rejection, wrong network, insufficient STT, pending nonce conflicts, gas estimation failures, RPC outages, reverted transactions, missing proof events, and delayed callbacks.

Callbacks can be recovered from History or by transaction hash. Users are explicitly told not to repay while an existing request is pending.

## State And Provenance

- Live economic facts come from contract reads, decoded events, receipts, connected wallet state, or explicit user input.
- Local storage contains user context, run history, and proof receipt references only.
- Server API routes are read-only.
- Fixture endpoints are labeled and are not shown as live economic state.

## Disabled Agent Economy

The modular Agent Economy contracts and source are retained, but their separate frontend is not a public product surface. Re-enabling it requires full live-flow verification, callback recovery, pull-payment accounting, authorization checks, and production-quality error handling.
