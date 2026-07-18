export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Settlement receipt
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        Call {callId}
      </h1>
      <p className="mt-4 text-[color:var(--muted)]">
        Receipt detail lands with Phase 5 settlement. This route is reserved in
        the application shell.
      </p>
    </main>
  );
}
