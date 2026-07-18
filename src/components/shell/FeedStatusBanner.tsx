import { listFeedCursors } from "@/lib/ingestion/cursors";
import { prisma } from "@/lib/db/prisma";

export async function FeedStatusBanner() {
  let cursors: Awaited<ReturnType<typeof listFeedCursors>> = [];
  let staleMarkets = 0;

  try {
    [cursors, staleMarkets] = await Promise.all([
      listFeedCursors(),
      prisma().market.count({ where: { availability: "stale" } }),
    ]);
  } catch {
    return null;
  }

  if (cursors.length === 0 && staleMarkets === 0) {
    return null;
  }

  const reconnecting = cursors.filter(
    (cursor) => cursor.status === "reconnecting" || cursor.status === "error"
  );
  const replay = cursors.some((cursor) => cursor.mode === "replay");

  // Healthy live feed — stay quiet. Only surface demo or degraded states.
  let label: string | null = null;
  let tone = "text-[color:var(--muted)] border-[color:var(--line)]";

  if (reconnecting.length > 0) {
    label = "Prices are reconnecting — boards may lag briefly";
    tone = "text-amber-200 border-amber-800/60 bg-amber-950/30";
  } else if (staleMarkets > 0) {
    label = "Some prices are updating — refresh if a board looks off";
    tone = "text-amber-200 border-amber-800/60 bg-amber-950/30";
  } else if (replay) {
    label = "Demo board — replay prices for testing";
    tone = "text-[color:var(--signal)] border-[color:var(--line)]";
  }

  if (!label) return null;

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-center text-sm ${tone}`}
    >
      {label}
    </div>
  );
}
