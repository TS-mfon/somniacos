import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSRevenue, osAvailable } from "../../../../lib/os-state";
import { getOSRevenueDirect } from "../../../../lib/server-os";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activity = await getOnchainActivity();
    const vault = await getOSRevenueDirect();
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
