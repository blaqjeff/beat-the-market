import { LoginPanel } from "@/components/auth/LoginPanel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--panel)]/80 p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
          Sign in
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
          Join the board
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Use an email magic link or sign a one-time message with Phantom. We
          never ask for your private key.
        </p>
        <div className="mt-8">
          <LoginPanel initialError={params.error ?? null} />
        </div>
      </section>
    </main>
  );
}
