import { worldEvents } from "@somniacos/shared";

export function GET() {
  return Response.json({
    provenance: "design-fixture",
    live: false,
    warning: "Seeded world events for design and tests. Use /api/onchain/activity for live Somnia events.",
    events: worldEvents,
    generatedAt: new Date().toISOString()
  });
}
