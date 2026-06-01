import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSRevenue, osAvailable } from "../../../../lib/os-state";
import { formatEther } from "viem";
import type { Address } from "viem";
import { osContracts, protocolFeeVaultAbi } from "../../../../lib/contracts";
import { publicClient } from "../../../../lib/server-onchain";

export const dynamic = "force-dynamic";

async function readFeeVault() {
  if (!osAvailable()) return null;
  const [feeAmount, feeRecipient, totalCollected] = await Promise.all([
    publicClient.readContract({
      address: osContracts.ProtocolFeeVault as Address,
      abi: protocolFeeVaultAbi,
      functionName: "feeAmount"
    }),
    publicClient.readContract({
      address: osContracts.ProtocolFeeVault as Address,
      abi: protocolFeeVaultAbi,
      functionName: "feeRecipient"
    }),
    publicClient.readContract({
      address: osContracts.ProtocolFeeVault as Address,
      abi: protocolFeeVaultAbi,
      functionName: "totalCollected"
    })
  ]);
  return {
    feeAmount: `${Number(formatEther(feeAmount)).toFixed(4)} STT`,
    feeRecipient,
    totalCollected: `${Number(formatEther(totalCollected)).toFixed(4)} STT`
  };
}

export async function GET() {
  try {
    const activity = await getOnchainActivity();
    const vault = await readFeeVault();
    const revenue = buildOSRevenue(activity);
    return Response.json({
      ok: true,
      configured: osAvailable(),
      revenue: vault ? { ...revenue, ...vault } : revenue
    });
  } catch (error) {
    return Response.json({ ok: false, configured: osAvailable(), error: error instanceof Error ? error.message : "Failed to load revenue", revenue: null }, { status: 500 });
  }
}
