export default async function MatchPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Match centre
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        Fixture {fixtureId}
      </h1>
      <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
        Live odds, score timeline, and credit calls arrive after TxLINE
        ingestion is online.
      </p>
    </main>
  );
}
