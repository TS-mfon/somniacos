import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSProcesses, osAvailable } from "../../../../lib/os-state";
import { getOSProcessesDirect } from "../../../../lib/server-os";
import { appErrorResponse } from "../../../../lib/app-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const direct = await getOSProcessesDirect().catch(() => []);
    if (direct.length) {
      return Response.json({
        ok: true,
        configured: osAvailable(),
        source: "contract",
        processes: direct
      });
    }
    const activity = await getOnchainActivity();
    return Response.json({
      ok: true,
      configured: osAvailable(),
      source: "events",
      processes: buildOSProcesses(activity)
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}
