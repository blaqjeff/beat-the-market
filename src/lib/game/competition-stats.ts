/**
 * Competition stats derived from settled calls.
 *
 * Ranking tie-break (documented):
 * 1. total points DESC
 * 2. accuracy DESC (won / decided, voids excluded)
 * 3. decided call count DESC
 * 4. username ASC (stable, case-sensitive)
 */

export interface SettledCallStatInput {
  result: "won" | "lost" | "void" | null;
  pointsAwarded: number;
  potentialPoints: number;
  probabilityBps: number;
  multiplierMilli: number;
  credits: number;
  settledAt: Date | string | null;
  callId: string;
}

export interface CompetitionStats {
  totalPoints: number;
  decidedCalls: number;
  wins: number;
  losses: number;
  voids: number;
  accuracyBps: number | null;
  currentWinStreak: number;
  bestWinStreak: number;
  biggestUpset: {
    callId: string;
    probabilityBps: number;
    multiplierMilli: number;
    pointsAwarded: number;
  } | null;
  marketBeating: {
    wins: number;
    points: number;
    score: number;
  };
}

export function computeCompetitionStats(
  calls: SettledCallStatInput[]
): CompetitionStats {
  const chronological = [...calls].sort((a, b) => {
    const at = a.settledAt ? new Date(a.settledAt).getTime() : 0;
    const bt = b.settledAt ? new Date(b.settledAt).getTime() : 0;
    return at - bt;
  });

  let wins = 0;
  let losses = 0;
  let voids = 0;
  let totalPoints = 0;
  let currentWinStreak = 0;
  let bestWinStreak = 0;
  let runningStreak = 0;
  let marketBeatingWins = 0;
  let marketBeatingPoints = 0;
  let biggestUpset: CompetitionStats["biggestUpset"] = null;

  for (const call of chronological) {
    totalPoints += call.pointsAwarded;
    if (call.result === "void" || call.result === null) {
      if (call.result === "void") voids += 1;
      continue;
    }
    if (call.result === "won") {
      wins += 1;
      runningStreak += 1;
      bestWinStreak = Math.max(bestWinStreak, runningStreak);
      if (call.probabilityBps < 5_000) {
        marketBeatingWins += 1;
        marketBeatingPoints += call.pointsAwarded;
      }
      if (
        !biggestUpset ||
        call.probabilityBps < biggestUpset.probabilityBps ||
        (call.probabilityBps === biggestUpset.probabilityBps &&
          call.pointsAwarded > biggestUpset.pointsAwarded)
      ) {
        biggestUpset = {
          callId: call.callId,
          probabilityBps: call.probabilityBps,
          multiplierMilli: call.multiplierMilli,
          pointsAwarded: call.pointsAwarded,
        };
      }
    } else {
      losses += 1;
      runningStreak = 0;
    }
  }

  currentWinStreak = 0;
  for (let i = chronological.length - 1; i >= 0; i -= 1) {
    const call = chronological[i]!;
    if (call.result === "void" || call.result === null) continue;
    if (call.result === "won") currentWinStreak += 1;
    else break;
  }

  const decidedCalls = wins + losses;
  const accuracyBps =
    decidedCalls === 0 ? null : Math.round((wins * 10_000) / decidedCalls);

  // Edge-weighted score: underdog wins contribute (5000 - probabilityBps).
  const marketBeatingScore = chronological.reduce((sum, call) => {
    if (call.result !== "won" || call.probabilityBps >= 5_000) return sum;
    return sum + (5_000 - call.probabilityBps);
  }, 0);

  return {
    totalPoints,
    decidedCalls,
    wins,
    losses,
    voids,
    accuracyBps,
    currentWinStreak,
    bestWinStreak,
    biggestUpset,
    marketBeating: {
      wins: marketBeatingWins,
      points: marketBeatingPoints,
      score: marketBeatingScore,
    },
  };
}

export interface RankablePlayer {
  userId: string;
  username: string;
  displayName: string;
  points: number;
  accuracyBps: number | null;
  decidedCalls: number;
}

export function compareRankablePlayers(a: RankablePlayer, b: RankablePlayer): number {
  if (b.points !== a.points) return b.points - a.points;
  const aAcc = a.accuracyBps ?? -1;
  const bAcc = b.accuracyBps ?? -1;
  if (bAcc !== aAcc) return bAcc - aAcc;
  if (b.decidedCalls !== a.decidedCalls) return b.decidedCalls - a.decidedCalls;
  return a.username.localeCompare(b.username);
}

export function rankPlayers(players: RankablePlayer[]): Array<RankablePlayer & { rank: number }> {
  const sorted = [...players].sort(compareRankablePlayers);
  return sorted.map((player, index) => ({ ...player, rank: index + 1 }));
}

/** Remarkable enough for a public share card (no private fields). */
export function isRemarkableCall(input: {
  result: string | null;
  probabilityBps: number;
  multiplierMilli: number;
  pointsAwarded: number;
}): boolean {
  if (input.result !== "won") return false;
  return (
    input.probabilityBps <= 4_000 ||
    input.multiplierMilli >= 3_000 ||
    input.pointsAwarded >= 200
  );
}
