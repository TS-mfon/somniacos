import { getOnchainActivity, publicClient } from "../../../../lib/server-onchain";

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
    const message = error instanceof Error ? error.message : "Unknown onchain read error";
    return Response.json({ ok: false, error: message, activity: [] }, { status: 500 });
  }
}
