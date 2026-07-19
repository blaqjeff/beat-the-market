import { isConsensusBookmaker } from "@/lib/txline/bookmakers";

export type OddsSnapshotLike = {
  id: string;
  bookmaker: string | null;
  bookmakerId: number | null;
  priceNames: unknown;
  pct: unknown;
  sourceTimestamp: bigint | number | string;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export { isConsensusBookmaker };

/** Snapshots newest-first → pick consensus trail, else newest book trail. */
export function pickQuoteTrail(snapshots: OddsSnapshotLike[]): {
  latest: OddsSnapshotLike | null;
  previous: OddsSnapshotLike | null;
} {
  if (snapshots.length === 0) return { latest: null, previous: null };

  const consensus = snapshots.filter(isConsensusBookmaker);
  const trail = consensus.length > 0 ? consensus : snapshots;
  return {
    latest: trail[0] ?? null,
    previous: trail[1] ?? null,
  };
}

export type BookmakerQuote = {
  bookmaker: string;
  bookmakerId: number | null;
  isConsensus: boolean;
  outcomes: Array<{ key: string; pct: string | null }>;
};

/** Latest quote per bookmaker (snapshots newest-first). */
export function buildBookmakerSpread(
  snapshots: OddsSnapshotLike[]
): BookmakerQuote[] {
  const seen = new Set<string>();
  const rows: BookmakerQuote[] = [];

  for (const snapshot of snapshots) {
    const key =
      snapshot.bookmakerId !== null
        ? `id:${snapshot.bookmakerId}`
        : `name:${snapshot.bookmaker ?? "unknown"}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const names = asStringArray(snapshot.priceNames);
    const pct = asStringArray(snapshot.pct);
    rows.push({
      bookmaker: snapshot.bookmaker ?? "Unknown",
      bookmakerId: snapshot.bookmakerId,
      isConsensus: isConsensusBookmaker(snapshot),
      outcomes: names.map((outcomeKey, index) => ({
        key: outcomeKey,
        pct: pct[index] ?? null,
      })),
    });
  }

  return rows.sort((a, b) => {
    if (a.isConsensus && !b.isConsensus) return -1;
    if (!a.isConsensus && b.isConsensus) return 1;
    return a.bookmaker.localeCompare(b.bookmaker);
  });
}

export function spreadRangeBps(
  spread: BookmakerQuote[],
  outcomeKey: string
): { minBps: number; maxBps: number; widthBps: number } | null {
  const values: number[] = [];
  for (const book of spread) {
    const outcome = book.outcomes.find((row) => row.key === outcomeKey);
    if (!outcome?.pct || outcome.pct.toUpperCase() === "NA") continue;
    const pct = Number(outcome.pct);
    if (!Number.isFinite(pct)) continue;
    values.push(Math.round(pct * 100));
  }
  if (values.length < 2) return null;
  const minBps = Math.min(...values);
  const maxBps = Math.max(...values);
  return { minBps, maxBps, widthBps: maxBps - minBps };
}
