import type { Hash, PublicClient } from "viem";

export const SOMNIA_GAS_FLOOR = {
  maxPriorityFeePerGas: 6_000_000_000n,
  maxFeePerGas: 20_000_000_000n,
  legacyGasPrice: 20_000_000_000n
} as const;

export type GasPricing =
  | { type: "eip1559"; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }
  | { type: "legacy"; gasPrice: bigint };

function bigintMax(a: bigint, b: bigint) {
  return a > b ? a : b;
}

export function bufferedGas(gas: bigint) {
  return gas + gas / 5n + 25_000n;
}

export async function estimateGasFees(publicClient: PublicClient): Promise<GasPricing> {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    if (fees.maxFeePerGas && fees.maxPriorityFeePerGas) {
      const priority = bigintMax(fees.maxPriorityFeePerGas * 2n, SOMNIA_GAS_FLOOR.maxPriorityFeePerGas);
      const cap = bigintMax(fees.maxFeePerGas * 2n, SOMNIA_GAS_FLOOR.maxFeePerGas);
      return { type: "eip1559", maxFeePerGas: bigintMax(cap, priority), maxPriorityFeePerGas: priority };
    }
  } catch {
    // Fall through to legacy gas price.
  }
  try {
    const gasPrice = await publicClient.getGasPrice();
    return { type: "legacy", gasPrice: bigintMax(gasPrice * 2n, SOMNIA_GAS_FLOOR.legacyGasPrice) };
  } catch {
    return { type: "legacy", gasPrice: SOMNIA_GAS_FLOOR.legacyGasPrice };
  }
}

export function gasCeiling(pricing: GasPricing) {
  return pricing.type === "eip1559" ? pricing.maxFeePerGas : pricing.gasPrice;
}

export function pricingArgs(pricing: GasPricing) {
  return pricing.type === "eip1559"
    ? { maxFeePerGas: pricing.maxFeePerGas, maxPriorityFeePerGas: pricing.maxPriorityFeePerGas }
    : { gasPrice: pricing.gasPrice };
}

export class PendingTxError extends Error {
  constructor(public readonly hash: Hash, message = "stuck in mempool") {
    super(message);
  }
}

export type WalletKind = "metamask" | "okx" | "rabby" | "unknown";

type InjectedWallet = {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  isRabby?: boolean;
};

export function detectWalletKind(ethereum: unknown): WalletKind {
  if (typeof ethereum !== "object" || ethereum === null) return "unknown";
  const provider = ethereum as InjectedWallet;
  // Rabby injects isMetaMask: true for compat, so check Rabby first.
  if (provider.isRabby) return "rabby";
  if (provider.isOkxWallet || provider.isOKExWallet) return "okx";
  if (provider.isMetaMask) return "metamask";
  return "unknown";
}

// On Somnia (a custom chain), Rabby ignores our EIP-1559 maxFeePerGas hint and shows its
// own "Normal" preset that can land at 10 wei. Submitting as a legacy type-0 tx with
// gasPrice forces the wallet to honor our number. MetaMask + OKX prefill our hint
// correctly on custom chains and benefit from the EIP-1559 path.
export function pickPricingForWallet(pricing: GasPricing, kind: WalletKind): GasPricing {
  if (kind === "metamask" || kind === "okx") return pricing;
  // Force legacy for Rabby / unknown.
  if (pricing.type === "eip1559") {
    return { type: "legacy", gasPrice: pricing.maxFeePerGas };
  }
  return pricing;
}

