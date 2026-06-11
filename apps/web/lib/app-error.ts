export type AppError = {
  code: string;
  message: string;
  action: string;
  retryable: boolean;
  technical?: string;
};

export function normalizeAppError(error: unknown): AppError {
  const technical = error instanceof Error ? error.message : String(error);
  const message = technical.toLowerCase();

  if (message.includes("user rejected") || message.includes("rejected") || message.includes("denied")) {
    return appError("WALLET_REJECTED", "You rejected the wallet request. No STT was spent.", "Retry when you are ready to approve the wallet prompt.", true, technical);
  }
  if (message.includes("no injected wallet") || message.includes("wallet not found")) {
    return appError("WALLET_NOT_FOUND", "No compatible browser wallet was found.", "Install or unlock MetaMask, Rabby, Brave Wallet, or Coinbase Wallet.", false, technical);
  }
  if (message.includes("wallet is locked") || message.includes("unauthorized")) {
    return appError("WALLET_LOCKED", "Your wallet is locked or has not authorized this site.", "Unlock the wallet, connect SomniacOS, then retry.", true, technical);
  }
  if (message.includes("nonce too low") || message.includes("replacement transaction underpriced") || message.includes("transaction underpriced")) {
    return appError("PENDING_TRANSACTION", "Your wallet has a conflicting pending transaction.", "Speed Up or Cancel the pending transaction in your wallet before retrying.", true, technical);
  }
  if (message.includes("intrinsic gas too low") || message.includes("gas required exceeds") || message.includes("estimate gas") || message.includes("gas estimation")) {
    return appError("GAS_ESTIMATION_FAILED", "Somnia could not prepare a safe gas estimate.", "Keep the suggested wallet gas settings, refresh the quote, and retry.", true, technical);
  }
  if (message.includes("insufficient funds") || message.includes("insufficient stt") || message.includes("underfunded")) {
    return appError("INSUFFICIENT_STT", "Your wallet does not have enough STT for this request and gas.", "Fund the wallet on Somnia Shannon, refresh the balance, then retry.", true, technical);
  }
  if (message.includes("transaction reverted") || message.includes("execution reverted")) {
    return appError("TRANSACTION_REVERTED", "The Somnia transaction reverted without completing the request.", "Open the explorer proof, refresh the quote, and retry only after correcting the cause.", true, technical);
  }
  if (message.includes("timeout") || message.includes("timed out") || message.includes("callback") || message.includes("usable result")) {
    return appError("CALLBACK_PENDING", "Somnia has not returned a usable callback result yet.", "Do not pay again. Keep the transaction hash and use History or Re-check to recover the existing request.", true, technical);
  }
  if (message.includes("failed to fetch") || message.includes("fetch failed") || message.includes("networkerror") || message.includes("rpc") || message.includes("rate limit")) {
    return appError("NETWORK_UNAVAILABLE", "Somnia RPC is temporarily unavailable.", "Wait briefly, then retry the read. Existing signed transactions remain recoverable.", true, technical);
  }
  if (message.includes("wrong network") || message.includes("chain") || message.includes("network")) {
    return appError("WRONG_NETWORK", "Your wallet is not connected to Somnia Shannon.", "Approve the network switch or switch to Somnia Shannon manually.", true, technical);
  }
  if (message.includes("event was not found") || message.includes("missing event") || message.includes("receipt")) {
    return appError("PROOF_NOT_FOUND", "The transaction confirmed, but SomniacOS could not decode its proof event.", "Keep the transaction hash and retry recovery from History.", true, technical);
  }
  if (message.includes("invalid url") || message.includes("unsupported url")) {
    return appError("INVALID_URL", "The website URL is invalid.", "Use a complete http:// or https:// URL, or remove it for LLM mode.", true, technical);
  }
  if (message.includes("task too large") || message.includes("constraints too large") || message.includes("too many urls") || message.includes("invalid address") || message.includes("required")) {
    return appError("INVALID_INPUT", "Some submitted details are invalid or exceed the allowed limits.", "Correct the highlighted input and retry.", true, technical);
  }
  if (message.includes("localstorage") || message.includes("quota") || message.includes("json") || message.includes("import")) {
    return appError("LOCAL_DATA_ERROR", "SomniacOS could not read or save local history data.", "Retry the action. Your onchain transactions are unaffected.", true, technical);
  }
  return appError("UNEXPECTED_ERROR", "SomniacOS could not complete that action.", "Retry once. If it persists, keep any transaction hash and return to the Workbench.", true, technical);
}

function appError(code: string, message: string, action: string, retryable: boolean, technical: string): AppError {
  return { code, message, action, retryable, technical: technical.slice(0, 500) };
}

export function appErrorResponse(error: unknown, status = 503) {
  const normalized = normalizeAppError(error);
  return Response.json({ ok: false, error: normalized }, { status });
}
