export default function LeaderboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Competition
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">
        Leaderboard
      </h1>
      <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
        Rankings will update from settled point ledgers once calls and
        settlement ship. Scoring uses capped multipliers from TxLINE implied
        probabilities.
      </p>
      <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--line)] px-6 py-16 text-center text-[color:var(--muted)]">
        No settled seasons yet.
      </div>
    </main>
  );
}
