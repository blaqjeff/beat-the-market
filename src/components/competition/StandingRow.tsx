import Link from "next/link";

export type StandingRowData = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  points: number;
  wins: number;
  losses: number;
  accuracyBps: number | null;
  bestWinStreak?: number;
  currentWinStreak?: number;
  marketBeatingScore?: number;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-[color:var(--line)] px-2.5 py-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
        {label}
      </span>
      <span className="text-xs tabular-nums text-[color:var(--chalk)]">
        {value}
      </span>
    </span>
  );
}

export function StandingRow({ row }: { row: StandingRowData }) {
  const streak = row.bestWinStreak ?? row.currentWinStreak ?? 0;
  const accuracy =
    row.accuracyBps !== null
      ? `${(row.accuracyBps / 100).toFixed(0)}%`
      : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/40 px-5 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--signal)]">
            #{row.rank}
          </span>
          <Link
            href={`/profile/${row.username}`}
            className="truncate text-lg text-[color:var(--chalk)] transition hover:text-[color:var(--signal)]"
          >
            {row.displayName}
          </Link>
        </div>
        <p className="mt-1 text-sm text-[color:var(--muted)]">@{row.username}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Metric label="Record" value={`${row.wins}W-${row.losses}L`} />
          {accuracy ? <Metric label="Hit rate" value={accuracy} /> : null}
          {streak > 0 ? <Metric label="Streak" value={String(streak)} /> : null}
          {(row.marketBeatingScore ?? 0) > 0 ? (
            <Metric label="Upset" value={String(row.marketBeatingScore)} />
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <p className="font-[family-name:var(--font-display)] text-3xl tracking-wide tabular-nums text-[color:var(--chalk)]">
          {row.points}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          pts
        </p>
      </div>
    </li>
  );
}
