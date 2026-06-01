import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSCapabilities, defaultCapabilities, osAvailable } from "../../../../lib/os-state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activity = await getOnchainActivity();
    const onchain = buildOSCapabilities(activity);
    return Response.json({
      ok: true,
      configured: osAvailable(),
      capabilities: onchain.length ? onchain : defaultCapabilities
    });
  } catch (error) {
    return Response.json({ ok: false, configured: osAvailable(), error: error instanceof Error ? error.message : "Failed to load capabilities", capabilities: defaultCapabilities }, { status: 500 });
  }
}
