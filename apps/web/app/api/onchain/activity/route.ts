import { getOnchainActivity, publicClient } from "../../../../lib/server-onchain";
import { appErrorResponse } from "../../../../lib/app-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [activity, blockNumber] = await Promise.all([
      getOnchainActivity(),
      publicClient.getBlockNumber()
    ]);

    return Response.json({
      ok: true,
      blockNumber: blockNumber.toString(),
      count: activity.length,
      activity
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}
