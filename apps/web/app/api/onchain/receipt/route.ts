import { type Hash } from "viem";
import { publicClient } from "../../../../lib/server-onchain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash") as Hash | null;
  if (!hash) return Response.json({ ok: false, error: "hash query parameter required" }, { status: 400 });

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash });
    return Response.json({
      ok: true,
      receipt: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        status: receipt.status
      }
    });
  } catch {
    return Response.json({ ok: true, receipt: null });
  }
}
