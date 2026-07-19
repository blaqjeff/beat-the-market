export function outcomeLabel(
  key: string,
  home: string,
  away: string
): string {
  if (key === "part1") return home;
  if (key === "part2") return away;
  if (key === "draw") return "Draw";
  if (key === "over") return "Over";
  if (key === "under") return "Under";
  return key;
}

function periodPrefix(marketPeriod: string | null = null): string {
  if (!marketPeriod) return "";
  const normalized = marketPeriod.trim().toLowerCase();
  if (
    normalized === "half=1" ||
    normalized === "1" ||
    normalized === "first_half" ||
    normalized === "1h"
  ) {
    return "1st half · ";
  }
  return `${marketPeriod} · `;
}

export function marketLabel(
  type: string,
  parameters: string | null = null,
  marketPeriod: string | null = null
): string {
  const prefix = periodPrefix(marketPeriod);
  if (type === "1X2_PARTICIPANT_RESULT") {
    return `${prefix}${marketPeriod ? "Result" : "Match result"}`;
  }
  if (type === "OVERUNDER_PARTICIPANT_GOALS") {
    const line = parameters?.replace(/^line=/i, "").trim();
    return `${prefix}${line ? `Total goals ${line}` : "Total goals"}`;
  }
  if (type === "ASIANHANDICAP_PARTICIPANT_GOALS") {
    const line = parameters?.replace(/^line=/i, "").trim();
    return `${prefix}${line ? `Handicap ${line}` : "Asian handicap"}`;
  }
  return `${prefix}${type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())}`;
}

export function phaseLabel(phase: string): string {
  if (phase === "in_play") return "In play";
  if (phase === "prematch") return "Pre-match";
  if (phase === "finished") return "Finished";
  if (phase === "suspended") return "Suspended";
  return "Status unknown";
}

/** Map raw fixture/game state strings to a short player-facing pill. */
export function fixturePhasePill(gameState: string | null): string {
  if (!gameState) return "Upcoming";
  const normalized = gameState.toLowerCase().replaceAll("_", " ");
  if (
    normalized.includes("finished") ||
    normalized.includes("ended") ||
    normalized.includes("ft") ||
    normalized.includes("full time")
  ) {
    return "Finished";
  }
  if (
    normalized.includes("live") ||
    normalized.includes("in play") ||
    normalized.includes("inplay") ||
    normalized.includes("1st") ||
    normalized.includes("2nd") ||
    normalized.includes("half")
  ) {
    return "Live";
  }
  if (normalized.includes("suspend")) return "Suspended";
  if (
    normalized.includes("not started") ||
    normalized.includes("prematch") ||
    normalized.includes("scheduled")
  ) {
    return "Upcoming";
  }
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function availabilityLabel(availability: string): string | null {
  if (availability === "open") return null;
  if (availability === "suspended") return "Suspended";
  if (availability === "closed") return "Closed";
  if (availability === "stale") return "Updating";
  return availability.replaceAll("_", " ");
}

export function formatMultiplier(milli: number | null): string {
  if (milli === null) return "—";
  return `${(milli / 1000).toFixed(2)}x`;
}
