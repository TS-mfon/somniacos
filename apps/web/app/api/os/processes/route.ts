import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSProcesses, osAvailable } from "../../../../lib/os-state";
import { getOSProcessesDirect } from "../../../../lib/server-os";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const direct = await getOSProcessesDirect();
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
    return Response.json({ ok: false, configured: osAvailable(), error: error instanceof Error ? error.message : "Failed to load OS processes", processes: [] }, { status: 500 });
  }
}
