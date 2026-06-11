import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSRevenue, osAvailable } from "../../../../lib/os-state";
import { getOSRevenueDirect } from "../../../../lib/server-os";
import { appErrorResponse } from "../../../../lib/app-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [activityResult, vaultResult] = await Promise.allSettled([getOnchainActivity(), getOSRevenueDirect()]);
    if (activityResult.status === "rejected" && vaultResult.status === "rejected") throw activityResult.reason;
    const activity = activityResult.status === "fulfilled" ? activityResult.value : [];
    const vault = vaultResult.status === "fulfilled" ? vaultResult.value : null;
    const revenue = buildOSRevenue(activity);
    return Response.json({
      ok: true,
      configured: osAvailable(),
      source: vault ? "contract" : "events",
      degraded: activityResult.status === "rejected" || vaultResult.status === "rejected",
      revenue: vault ? { ...revenue, ...vault } : revenue
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}
