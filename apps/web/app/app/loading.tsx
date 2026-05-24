export default function AppLoading() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="panel rounded-[2rem] p-8 text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-white/10 border-t-signal" />
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-signal">Synchronizing agents</p>
        <p className="mt-2 text-white/55">Fetching world events, agent state, and onchain surfaces...</p>
      </div>
    </div>
  );
}
