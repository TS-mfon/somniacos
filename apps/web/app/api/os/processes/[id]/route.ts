import { getOnchainActivity } from "../../../../../lib/server-onchain";
import { buildOSProcesses, osAvailable } from "../../../../../lib/os-state";
import { getOSProcessDirect } from "../../../../../lib/server-os";
import { appErrorResponse } from "../../../../../lib/app-error";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const direct = await getOSProcessDirect(id);
    if (direct) {
      return Response.json({
        ok: true,
        configured: osAvailable(),
        source: "contract",
        process: direct
      });
    }
    const activity = await getOnchainActivity();
    const process = buildOSProcesses(activity).find((item) => item.id === id);
    return Response.json({
      ok: true,
      configured: osAvailable(),
      source: "events",
      process: process ?? null
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}
