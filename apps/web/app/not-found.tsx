import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-obsidian bg-radial-grid px-5 text-mercury">
      <section className="panel max-w-2xl rounded-[2rem] p-8 text-center">
        <p className="text-xs uppercase tracking-[0.42em] text-ember">404 / Missing route</p>
        <h1 className="mt-3 font-display text-5xl text-white">This economic zone does not exist.</h1>
        <p className="mt-4 leading-7 text-white/62">The requested page is not part of the current SomniacOS world map.</p>
        <Link href="/app/agent-workbench" className="mt-8 inline-flex rounded-full bg-signal px-6 py-3 font-semibold text-black">Return to Workbench</Link>
      </section>
    </main>
  );
}
