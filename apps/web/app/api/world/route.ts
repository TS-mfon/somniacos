import { worldEvents } from "@somniacos/shared";

export function GET() {
  return Response.json({ events: worldEvents, generatedAt: new Date().toISOString() });
}
