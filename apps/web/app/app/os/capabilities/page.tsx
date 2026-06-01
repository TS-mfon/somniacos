import { PageHero } from "../../../../components/chrome";
import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSCapabilities, defaultCapabilities } from "../../../../lib/os-state";

export const dynamic = "force-dynamic";

export default async function OSCapabilitiesPage() {
  const activity = await getOnchainActivity();
  const onchain = buildOSCapabilities(activity);
  const capabilities = onchain.length ? onchain : defaultCapabilities;

  return (
    <>
      <PageHero title="Capability Directory" eyebrow="Agent-discoverable services">Stable machine-readable services agents can inspect and invoke through the SomniacOS kernel.</PageHero>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((capability) => (
          <article key={capability.id} className="panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{capability.mode}</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{capability.label}</h2>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/45">{capability.active ? "active" : "off"}</span>
            </div>
            <p className="mt-4 break-all font-mono text-xs text-white/45">{capability.id}</p>
            <p className="mt-3 text-sm text-white/50">Somnia agent ID: {capability.somniaAgentId}</p>
            <p className="mt-2 break-all text-sm text-white/38">{capability.schemaURI}</p>
            <p className="mt-4 rounded-2xl border border-signal/15 bg-signal/[0.04] p-3 text-sm text-white/55">Protocol fee per invocation: <span className="text-signal">0.1 STT</span></p>
          </article>
        ))}
      </div>
    </>
  );
}
