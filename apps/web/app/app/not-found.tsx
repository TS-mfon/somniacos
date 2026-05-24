import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <section className="panel max-w-2xl rounded-[2rem] p-8 text-center">
        <p className="text-xs uppercase tracking-[0.42em] text-ember">Unknown function</p>
        <h1 className="mt-3 font-display text-5xl text-white">This dApp function is not registered.</h1>
        <p className="mt-4 leading-7 text-white/62">Use the command center to navigate to a known autonomous economy surface.</p>
        <Link href="/app" className="mt-8 inline-flex rounded-full bg-signal px-6 py-3 font-semibold text-black">Open command center</Link>
      </section>
    </div>
  );
}
