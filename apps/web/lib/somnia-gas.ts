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

export async function assertSubmittedGasFloor(publicClient: PublicClient, hash: Hash) {
  const floor = SOMNIA_GAS_FLOOR.maxFeePerGas / 2n;
  try {
    const tx = await publicClient.getTransaction({ hash });
    const effective = tx.maxFeePerGas ?? tx.gasPrice ?? 0n;
    if (effective > 0n && effective < floor) {
      throw new PendingTxError(hash, "stuck in mempool: gas too low");
    }
  } catch (error) {
    if (error instanceof PendingTxError) throw error;
    // Transaction not yet propagated — let the normal receipt wait handle it.
  }
}
