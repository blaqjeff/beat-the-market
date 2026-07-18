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

  const live = cursors.filter((cursor) => cursor.status === "connected");
  const reconnecting = cursors.filter(
    (cursor) => cursor.status === "reconnecting" || cursor.status === "error"
  );
  const replay = cursors.some((cursor) => cursor.mode === "replay");

  let label = "Feed idle";
  let tone = "text-[color:var(--muted)] border-[color:var(--line)]";

  if (reconnecting.length > 0) {
    label = `Feed reconnecting (${reconnecting.map((c) => c.stream).join(", ")})`;
    tone = "text-amber-200 border-amber-800/60 bg-amber-950/30";
  } else if (staleMarkets > 0) {
    label = `${staleMarkets} market${staleMarkets === 1 ? "" : "s"} marked stale`;
    tone = "text-amber-200 border-amber-800/60 bg-amber-950/30";
  } else if (replay) {
    label = "Demo feed — TxLINE replay data";
    tone = "text-[color:var(--signal)] border-[color:var(--line)]";
  } else if (live.length > 0) {
    label = "Live TxLINE feed connected";
    tone = "text-[color:var(--signal)] border-[color:var(--line)]";
  }

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] ${tone}`}
    >
      {label}
    </div>
  );
}
