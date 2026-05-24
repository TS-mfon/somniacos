export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-obsidian bg-radial-grid text-mercury">
      <div className="panel rounded-[2rem] p-8 text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-white/10 border-t-signal" />
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-signal">Booting SomniacOS</p>
        <p className="mt-2 text-white/55">Loading autonomous economy state...</p>
      </div>
    </main>
  );
}
