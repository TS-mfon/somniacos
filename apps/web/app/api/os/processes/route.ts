import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSProcesses, osAvailable } from "../../../../lib/os-state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activity = await getOnchainActivity();
    return Response.json({
      ok: true,
      configured: osAvailable(),
      processes: buildOSProcesses(activity)
    });
  } catch (error) {
    return Response.json({ ok: false, configured: osAvailable(), error: error instanceof Error ? error.message : "Failed to load OS processes", processes: [] }, { status: 500 });
  }
}
