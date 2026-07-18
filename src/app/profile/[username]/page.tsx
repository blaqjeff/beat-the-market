import { prisma } from "@/lib/db/prisma";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let user: { username: string; displayName: string | null; createdAt: Date } | null =
    null;
  try {
    user = await prisma().user.findUnique({
      where: { username },
      select: {
        username: true,
        displayName: true,
        createdAt: true,
      },
    });
  } catch {
    user = null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">
        Profile
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[color:var(--chalk)]">
        @{username}
      </h1>
      {user ? (
        <p className="mt-4 text-[color:var(--muted)]">
          {user.displayName ?? user.username} · joined{" "}
          {user.createdAt.toISOString().slice(0, 10)}
        </p>
      ) : (
        <p className="mt-4 text-[color:var(--muted)]">
          Profile unavailable or not found.
        </p>
      )}
    </main>
  );
}
