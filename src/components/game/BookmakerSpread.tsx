"use client";

import { outcomeLabel } from "@/lib/game/labels";

type BookmakerQuote = {
  bookmaker: string;
  bookmakerId: number | null;
  isConsensus: boolean;
  outcomes: Array<{ key: string; pct: string | null }>;
};

export function BookmakerSpread({
  bookmakers,
  home,
  away,
}: {
  bookmakers: BookmakerQuote[];
  home: string;
  away: string;
}) {
  if (bookmakers.length < 2) return null;

  const outcomeKeys = bookmakers[0]?.outcomes.map((row) => row.key) ?? [];

  return (
    <details className="mt-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--pitch)]/40 px-3 py-2">
      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)] hover:text-[color:var(--chalk)]">
        Bookmaker spread · {bookmakers.length} books
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
              <th className="pb-2 pr-3 font-normal">Book</th>
              {outcomeKeys.map((key) => (
                <th key={key} className="pb-2 pr-2 font-normal">
                  {outcomeLabel(key, home, away)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookmakers.map((book) => (
              <tr key={`${book.bookmakerId ?? book.bookmaker}`}>
                <td className="py-1.5 pr-3 text-[color:var(--chalk)]">
                  {book.bookmaker}
                  {book.isConsensus ? (
                    <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--signal)]">
                      consensus
                    </span>
                  ) : null}
                </td>
                {outcomeKeys.map((key) => {
                  const pct =
                    book.outcomes.find((row) => row.key === key)?.pct ?? "—";
                  return (
                    <td
                      key={key}
                      className="py-1.5 pr-2 font-mono tabular-nums text-[color:var(--muted)]"
                    >
                      {pct === "—" ? "—" : `${pct}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        Calls price off the TxLINE consensus row. Spread shows how far books
        disagree.
      </p>
    </details>
  );
}
