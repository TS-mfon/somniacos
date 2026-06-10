import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHero } from "../../../../components/chrome";
import { skillRegistry } from "../../../../lib/agents/skill-registry";

export default function SkillsCatalogPage() {
  return (
    <>
      <PageHero title="Agent Skills" eyebrow="Somnia Agent Economy">
        Call on-chain skills powered by real Somnia validator inference. Each run forwards a live deposit, dispatches to the
        Agents Platform, and resolves its result on-chain.
      </PageHero>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {skillRegistry.map((skill) => (
          <Link
            key={skill.id}
            href={`/app/agents/skills/${skill.id}`}
            className="panel group rounded-2xl p-5 transition hover:border-signal/35"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{skill.category}</p>
            <h2 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-white">
              <Sparkles className="h-5 w-5 text-cyan-300" /> {skill.name}
            </h2>
            <p className="mt-3 min-h-20 text-sm leading-6 text-white/55">{skill.description}</p>
            <span className="mt-5 inline-flex rounded-xl bg-signal px-4 py-2 text-sm font-semibold text-black">Try it</span>
          </Link>
        ))}
      </div>
    </>
  );
}
