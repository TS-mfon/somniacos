import { type Hash } from "viem";
import { appErrorResponse } from "../../../../lib/app-error";
import { publicClient } from "../../../../lib/server-onchain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash") as Hash | null;
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    return appErrorResponse(new Error("A valid transaction hash is required."), 400);
  }

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
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("not found") || message.includes("could not be found")) {
      return Response.json({ ok: true, receipt: null });
    }
    return appErrorResponse(error);
  }
}
