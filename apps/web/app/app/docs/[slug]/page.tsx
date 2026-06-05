import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../../components/chrome";
import { docsSections, getDocsSection } from "../../../../lib/docs-content";

export function generateStaticParams() {
  return docsSections.map((section) => ({ slug: section.slug }));
}

export default async function DocsSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = getDocsSection(slug);
  if (!section) notFound();

  return (
    <>
      <PageHero title={section.title} eyebrow={section.eyebrow}>{section.summary}</PageHero>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid gap-4">
          {section.body.map((block) => (
            <article key={block.heading} className="panel rounded-[1.5rem] p-5 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{block.heading}</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-white/64">
                {block.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {block.bullets?.length ? (
                <div className="mt-5 grid gap-2">
                  {block.bullets.map((bullet) => (
                    <div key={bullet} className="rounded-xl border border-white/10 bg-[#101010] p-3 text-sm leading-6 text-white/58">{bullet}</div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>
        <aside className="space-y-4">
          <div className="panel rounded-[1.5rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Docs sections</p>
            <div className="mt-4 grid gap-2">
              {docsSections.map((item) => (
                <Link key={item.slug} href={`/app/docs/${item.slug}`} className={`rounded-xl border p-3 text-sm transition ${item.slug === section.slug ? "border-signal/40 bg-signal/10 text-white" : "border-white/10 bg-[#101010] text-white/55 hover:border-signal/30"}`}>
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/app/docs" className="inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/62 hover:text-white">Back to Docs index</Link>
        </aside>
      </div>
    </>
  );
}
