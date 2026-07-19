import {
  diffSideTotals,
  hasAnySideStats,
  liveScoreFromSideTotals,
  sideTotalsFromStats,
  type MatchSideTotals,
  type SideDelta,
} from "@/lib/game/side-stats";

export interface LiveScore {
  home: number;
  away: number;
  participant1: number;
  participant2: number;
}

export interface LiveClock {
  seconds: number | null;
  minutes: number | null;
  running: boolean | null;
  display: string | null;
}

export type TimelineKind =
  | "goal"
  | "kickoff"
  | "halftime"
  | "resume"
  | "suspend"
  | "finish"
  | "card"
  | "corner"
  | "var"
  | "note"
  | "other";

export interface TimelineEvent {
  sequence: number;
  action: string;
  kind: TimelineKind;
  headline: string;
  gameState: string | null;
  sourceTimestamp: string | null;
  homeScore: number | null;
  awayScore: number | null;
  matchMinute: number | null;
  /** @deprecated prefer headline — kept for older clients */
  summary: string;
  visible: boolean;
}

export type MatchTempo = "cold" | "steady" | "hot" | "frantic";

export interface MomentumSeriesPoint {
  minute: number | null;
  balance: number;
  tempoScore: number;
}

export interface MatchMomentum {
  /** -100 (away run) … +100 (home run) */
  balance: number;
  homePressure: number;
  awayPressure: number;
  tempo: MatchTempo;
  /** 0–100 event density */
  tempoScore: number;
  label: string;
  drivers: string[];
  /** Chronological balance samples for the live graph. */
  series: MomentumSeriesPoint[];
}

export interface LiveBoard {
  score: LiveScore;
  clock: LiveClock;
  gameState: string | null;
  phase: "prematch" | "in_play" | "finished" | "suspended" | "unknown";
  callsBlocked: boolean;
  blockReason: string | null;
  timeline: TimelineEvent[];
  lastEventAt: string | null;
  /** Running match totals (goals / cards / corners). */
  sideStats: MatchSideTotals;
  /** Score frozen at half-time when TxLINE emits HT (or inferred before 2nd half). */
  firstHalfScore: LiveScore | null;
  momentum: MatchMomentum;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

export function goalsFromStats(
  stats: unknown,
  participant1IsHome: boolean
): LiveScore {
  return liveScoreFromSideTotals(
    sideTotalsFromStats(stats, participant1IsHome, 0)
  );
}

export function clockFromPayload(payload: unknown): LiveClock {
  const root = asRecord(payload);
  const data = asRecord(root.Data ?? root.data);
  const clock = asRecord(
    root.Clock ?? root.clock ?? data.Clock ?? data.clock
  );
  const seconds =
    numberFromUnknown(clock.seconds ?? clock.Seconds) ??
    numberFromUnknown(root.Seconds ?? data.Seconds);
  const minutes =
    numberFromUnknown(root.Minutes ?? root.minutes ?? data.Minutes ?? data.minutes) ??
    (seconds !== null ? Math.floor(seconds / 60) : null);
  const runningRaw = clock.running ?? clock.Running;
  const running =
    typeof runningRaw === "boolean"
      ? runningRaw
      : runningRaw === undefined
        ? null
        : Boolean(runningRaw);

  let display: string | null = null;
  if (minutes !== null) {
    const rem = seconds !== null ? seconds % 60 : 0;
    display =
      rem > 0
        ? `${minutes}'${String(rem).padStart(2, "0")}`
        : `${minutes}'`;
  } else if (seconds !== null) {
    display = `${Math.floor(seconds / 60)}'`;
  }

  return { seconds, minutes, running, display };
}

export function inferMatchPhase(gameState: string | null): LiveBoard["phase"] {
  const state = (gameState ?? "").toLowerCase();
  if (!state) return "unknown";
  if (
    state.includes("suspend") ||
    state.includes("interrupt") ||
    state.includes("abandon")
  ) {
    return "suspended";
  }
  if (
    state.includes("final") ||
    state.includes("finished") ||
    state.includes("ended") ||
    state.includes("cancel") ||
    state === "100"
  ) {
    return "finished";
  }
  if (
    state.includes("schedul") ||
    state.includes("not_started") ||
    state.includes("prematch") ||
    state === "1"
  ) {
    return "prematch";
  }
  if (
    state.includes("play") ||
    state.includes("live") ||
    state.includes("half") ||
    state.includes("break") ||
    state.includes("extra") ||
    state.includes("penalt")
  ) {
    return "in_play";
  }
  return "unknown";
}

export function materialSuspensionAction(action: string): boolean {
  const normalized = action.toLowerCase();
  return (
    normalized.includes("goal") ||
    normalized.includes("red_card") ||
    normalized.includes("redcard") ||
    normalized.includes("var") ||
    normalized.includes("penalty") ||
    normalized.includes("suspend") ||
    normalized.includes("interrupt")
  );
}

const NOISE_ACTIONS = new Set([
  "comment",
  "coverage_update",
  "heartbeat",
  "ping",
  "stats_update",
]);

export function timelineKind(action: string): TimelineKind {
  const a = action.toLowerCase();
  if (a.includes("goal") && !a.includes("goalscorer")) return "goal";
  if (a.includes("kick_off") || a.includes("kickoff")) return "kickoff";
  if (a.includes("half_time") || a.includes("halftime")) return "halftime";
  if (a.includes("resume") || a.includes("second_half")) return "resume";
  if (a.includes("suspend") || a.includes("interrupt")) return "suspend";
  if (
    a.includes("final") ||
    a.includes("finished") ||
    a.includes("full_time") ||
    a.includes("fulltime")
  ) {
    return "finish";
  }
  if (a.includes("corner")) return "corner";
  if (a.includes("card")) return "card";
  if (a.includes("var")) return "var";
  if (NOISE_ACTIONS.has(a)) return "note";
  return "other";
}

function deltaHeadline(
  delta: SideDelta,
  homeName: string,
  awayName: string,
  red: boolean
): { kind: TimelineKind; headline: string } | null {
  if (delta.homeGoals > 0) {
    return { kind: "goal", headline: `${homeName} score` };
  }
  if (delta.awayGoals > 0) {
    return { kind: "goal", headline: `${awayName} score` };
  }
  if (delta.homeRed > 0) {
    return { kind: "card", headline: `${homeName} red card` };
  }
  if (delta.awayRed > 0) {
    return { kind: "card", headline: `${awayName} red card` };
  }
  if (delta.homeYellow > 0) {
    return {
      kind: "card",
      headline: red ? `${homeName} card` : `${homeName} yellow card`,
    };
  }
  if (delta.awayYellow > 0) {
    return {
      kind: "card",
      headline: red ? `${awayName} card` : `${awayName} yellow card`,
    };
  }
  if (delta.homeCorners > 0) {
    return { kind: "corner", headline: `${homeName} corner` };
  }
  if (delta.awayCorners > 0) {
    return { kind: "corner", headline: `${awayName} corner` };
  }
  return null;
}

export function timelineHeadline(input: {
  action: string;
  kind: TimelineKind;
  homeScore: number | null;
  awayScore: number | null;
  previousHome: number | null;
  previousAway: number | null;
  homeName?: string;
  awayName?: string;
}): string {
  const home = input.homeName ?? "Home";
  const away = input.awayName ?? "Away";

  if (input.kind === "goal") {
    if (
      input.homeScore !== null &&
      input.previousHome !== null &&
      input.homeScore > input.previousHome
    ) {
      return `${home} score`;
    }
    if (
      input.awayScore !== null &&
      input.previousAway !== null &&
      input.awayScore > input.previousAway
    ) {
      return `${away} score`;
    }
    return "Goal";
  }

  switch (input.kind) {
    case "kickoff":
      return "Kick-off";
    case "halftime":
      return "Half-time";
    case "resume":
      return input.action.toLowerCase().includes("second")
        ? "Second half"
        : "Play resumes";
    case "suspend":
      return "Markets paused";
    case "finish":
      return "Full time";
    case "card":
      return input.action.toLowerCase().includes("red")
        ? "Red card"
        : "Card";
    case "corner":
      return "Corner";
    case "var":
      return "VAR check";
    case "note":
      return "Update";
    default:
      return input.action
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tempoFromScore(tempoScore: number): MatchTempo {
  if (tempoScore >= 70) return "frantic";
  if (tempoScore >= 45) return "hot";
  if (tempoScore >= 20) return "steady";
  return "cold";
}

function momentumLabel(
  balance: number,
  tempo: MatchTempo,
  homeName: string,
  awayName: string,
  phase: LiveBoard["phase"]
): string {
  if (phase === "prematch") return "Waiting for kick-off";
  if (phase === "finished") return "Full time";
  const abs = Math.abs(balance);
  const side =
    abs < 12
      ? "Even contest"
      : balance > 0
        ? `${homeName} on top`
        : `${awayName} on top`;
  if (tempo === "frantic") return `${side} · frantic tempo`;
  if (tempo === "hot") return `${side} · hot spell`;
  if (tempo === "cold") return `${side} · quiet spell`;
  return side;
}

export function buildMatchMomentum(input: {
  phase: LiveBoard["phase"];
  homeName: string;
  awayName: string;
  pulses: Array<{
    homeDelta: number;
    awayDelta: number;
    heat: number;
    driver: string | null;
    weight: number;
  }>;
  /** Positive = consensus shifting toward home (part1 if home). */
  oddsBiasHomeBps?: number | null;
  series?: MomentumSeriesPoint[];
}): MatchMomentum {
  let homeRaw = 0;
  let awayRaw = 0;
  let heat = 0;
  const drivers: string[] = [];

  for (const pulse of input.pulses) {
    homeRaw += pulse.homeDelta * pulse.weight;
    awayRaw += pulse.awayDelta * pulse.weight;
    heat += pulse.heat * pulse.weight;
    if (pulse.driver && drivers.length < 3) {
      drivers.push(pulse.driver);
    }
  }

  const oddsBias = input.oddsBiasHomeBps ?? 0;
  if (oddsBias > 80) {
    homeRaw += Math.min(18, oddsBias / 40);
    if (drivers.length < 3) drivers.push("Consensus drifting home");
  } else if (oddsBias < -80) {
    awayRaw += Math.min(18, Math.abs(oddsBias) / 40);
    if (drivers.length < 3) drivers.push("Consensus drifting away");
  }

  const total = homeRaw + awayRaw;
  const homePressure =
    total <= 0 ? 50 : clamp(Math.round((homeRaw / total) * 100), 0, 100);
  const awayPressure = 100 - homePressure;
  const balance = clamp(Math.round(homeRaw - awayRaw), -100, 100);
  const tempoScore = clamp(Math.round(heat), 0, 100);
  const tempo = tempoFromScore(tempoScore);

  return {
    balance,
    homePressure,
    awayPressure,
    tempo,
    tempoScore,
    label: momentumLabel(
      balance,
      tempo,
      input.homeName,
      input.awayName,
      input.phase
    ),
    drivers,
    series: input.series ?? [],
  };
}

function pulseFromDelta(
  delta: SideDelta,
  homeName: string,
  awayName: string
): {
  homeDelta: number;
  awayDelta: number;
  heat: number;
  driver: string | null;
} {
  let homeDelta = 0;
  let awayDelta = 0;
  let heat = 0;
  let driver: string | null = null;

  if (delta.homeGoals > 0) {
    homeDelta += 28 * delta.homeGoals;
    heat += 22 * delta.homeGoals;
    driver = `${homeName} goal`;
  }
  if (delta.awayGoals > 0) {
    awayDelta += 28 * delta.awayGoals;
    heat += 22 * delta.awayGoals;
    driver = `${awayName} goal`;
  }
  if (delta.homeCorners > 0) {
    homeDelta += 5 * delta.homeCorners;
    heat += 6 * delta.homeCorners;
    driver = driver ?? `${homeName} corner`;
  }
  if (delta.awayCorners > 0) {
    awayDelta += 5 * delta.awayCorners;
    heat += 6 * delta.awayCorners;
    driver = driver ?? `${awayName} corner`;
  }
  if (delta.homeYellow > 0) {
    awayDelta += 3 * delta.homeYellow;
    heat += 4 * delta.homeYellow;
    driver = driver ?? `${homeName} yellow`;
  }
  if (delta.awayYellow > 0) {
    homeDelta += 3 * delta.awayYellow;
    heat += 4 * delta.awayYellow;
    driver = driver ?? `${awayName} yellow`;
  }
  if (delta.homeRed > 0) {
    awayDelta += 20 * delta.homeRed;
    heat += 18 * delta.homeRed;
    driver = `${homeName} red card`;
  }
  if (delta.awayRed > 0) {
    homeDelta += 20 * delta.awayRed;
    heat += 18 * delta.awayRed;
    driver = `${awayName} red card`;
  }

  return { homeDelta, awayDelta, heat, driver };
}

function isHalfTimeAction(action: string, gameState: string | null): boolean {
  const a = action.toLowerCase();
  const g = (gameState ?? "").toLowerCase();
  return (
    a.includes("half_time") ||
    a.includes("halftime") ||
    g.includes("half_time") ||
    g === "halftime"
  );
}

function isSecondHalfStart(action: string, gameState: string | null): boolean {
  const a = action.toLowerCase();
  const g = (gameState ?? "").toLowerCase();
  return (
    a.includes("second_half") ||
    (a.includes("resume") && g.includes("second")) ||
    g.includes("second_half")
  );
}

export interface MatchEventLike {
  sequence: number;
  action: string;
  gameState: string | null;
  sourceTimestamp: bigint | number | string | null;
  stats: unknown;
  data: unknown;
  rawPayload: unknown;
}

export function buildLiveBoard(input: {
  gameState: string | null;
  participant1IsHome: boolean;
  events: MatchEventLike[];
  marketsSuspended?: boolean;
  homeName?: string;
  awayName?: string;
  /** Positive = 1X2 consensus moved toward the home side. */
  oddsBiasHomeBps?: number | null;
}): LiveBoard {
  const homeName = input.homeName ?? "Home";
  const awayName = input.awayName ?? "Away";
  const ordered = [...input.events].sort((a, b) => a.sequence - b.sequence);
  let sideStats = sideTotalsFromStats({}, input.participant1IsHome);
  let score = liveScoreFromSideTotals(sideStats);
  let clock = clockFromPayload({});
  const timeline: TimelineEvent[] = [];
  let previousHome: number | null = null;
  let previousAway: number | null = null;
  let previousSides: MatchSideTotals | null = null;
  let firstHalfScore: LiveScore | null = null;
  const pulses: Array<{
    homeDelta: number;
    awayDelta: number;
    heat: number;
    driver: string | null;
    weight: number;
  }> = [];
  const seriesPulses: Array<{
    homeDelta: number;
    awayDelta: number;
    heat: number;
    driver: string | null;
    weight: number;
  }> = [];
  const series: MomentumSeriesPoint[] = [{ minute: 0, balance: 0, tempoScore: 0 }];

  for (let index = 0; index < ordered.length; index += 1) {
    const event = ordered[index]!;
    const hasStats = hasAnySideStats(event.stats);
    if (hasStats) {
      sideStats = sideTotalsFromStats(event.stats, input.participant1IsHome);
      score = liveScoreFromSideTotals(sideStats);
    }
    const eventClock = clockFromPayload(event.rawPayload ?? event.data);
    if (
      eventClock.seconds !== null ||
      eventClock.minutes !== null ||
      eventClock.display
    ) {
      clock = eventClock;
    }

    const delta = hasStats
      ? diffSideTotals(previousSides, sideStats)
      : {
          homeGoals: 0,
          awayGoals: 0,
          homeYellow: 0,
          awayYellow: 0,
          homeRed: 0,
          awayRed: 0,
          homeCorners: 0,
          awayCorners: 0,
        };

    let kind = timelineKind(event.action);
    let headline = timelineHeadline({
      action: event.action,
      kind,
      homeScore: hasStats ? score.home : null,
      awayScore: hasStats ? score.away : null,
      previousHome,
      previousAway,
      homeName,
      awayName,
    });

    const fromDelta = hasStats
      ? deltaHeadline(
          delta,
          homeName,
          awayName,
          event.action.toLowerCase().includes("red")
        )
      : null;
    if (fromDelta && (kind === "note" || kind === "other" || kind === "card")) {
      kind = fromDelta.kind;
      headline = fromDelta.headline;
    } else if (fromDelta && kind === "goal") {
      headline = fromDelta.headline;
    }

    const pulse = pulseFromDelta(delta, homeName, awayName);
    if (pulse.heat > 0 || pulse.homeDelta > 0 || pulse.awayDelta > 0) {
      const age = ordered.length - 1 - index;
      const weight = age <= 2 ? 1 : age <= 5 ? 0.65 : 0.35;
      pulses.push({ ...pulse, weight });
      seriesPulses.push({ ...pulse, weight: 1 });
      const snap = buildMatchMomentum({
        phase: "in_play",
        homeName,
        awayName,
        pulses: seriesPulses,
        oddsBiasHomeBps: null,
      });
      series.push({
        minute: eventClock.minutes,
        balance: snap.balance,
        tempoScore: snap.tempoScore,
      });
    }

    const homeScore = hasStats ? score.home : null;
    const awayScore = hasStats ? score.away : null;
    const scoreline =
      homeScore !== null && awayScore !== null
        ? `${homeScore}–${awayScore}`
        : null;
    const summary = scoreline ? `${headline} · ${scoreline}` : headline;
    const visible =
      kind !== "note" ||
      Boolean(fromDelta && (pulse.heat > 0 || pulse.driver));

    timeline.push({
      sequence: event.sequence,
      action: event.action,
      kind,
      headline,
      gameState: event.gameState,
      sourceTimestamp:
        event.sourceTimestamp === null || event.sourceTimestamp === undefined
          ? null
          : String(event.sourceTimestamp),
      homeScore,
      awayScore,
      matchMinute: eventClock.minutes,
      summary,
      visible,
    });

    if (isHalfTimeAction(event.action, event.gameState) && hasStats) {
      firstHalfScore = { ...score };
    }
    if (
      !firstHalfScore &&
      isSecondHalfStart(event.action, event.gameState) &&
      previousHome !== null &&
      previousAway !== null
    ) {
      firstHalfScore = {
        home: previousHome,
        away: previousAway,
        participant1: input.participant1IsHome ? previousHome : previousAway,
        participant2: input.participant1IsHome ? previousAway : previousHome,
      };
    }

    // Prefer explicit first-half period keys when TxLINE publishes them.
    if (hasStats) {
      const keys = Object.keys(asRecord(event.stats));
      const hasFirstHalfGoals = keys.some((key) => {
        const n = Number(key);
        return n === 1001 || n === 1002;
      });
      if (hasFirstHalfGoals) {
        firstHalfScore = liveScoreFromSideTotals(
          sideTotalsFromStats(event.stats, input.participant1IsHome, 1)
        );
      }
    }

    if (hasStats) {
      previousHome = score.home;
      previousAway = score.away;
      previousSides = sideStats;
    }
  }

  // Incomplete feeds sometimes skip half_time; freeze score from last ≤45' event.
  if (!firstHalfScore) {
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      const event = ordered[index]!;
      const minutes = clockFromPayload(event.rawPayload ?? event.data).minutes;
      if (
        minutes !== null &&
        minutes <= 45 &&
        hasAnySideStats(event.stats)
      ) {
        firstHalfScore = liveScoreFromSideTotals(
          sideTotalsFromStats(event.stats, input.participant1IsHome)
        );
        break;
      }
    }
  }

  const latest = ordered[ordered.length - 1] ?? null;
  const gameState = latest?.gameState ?? input.gameState;
  const phase = inferMatchPhase(gameState);
  const recentMaterial = latest
    ? materialSuspensionAction(latest.action)
    : false;
  const callsBlocked =
    phase === "suspended" ||
    phase === "finished" ||
    Boolean(input.marketsSuspended);

  let blockReason: string | null = null;
  if (phase === "finished") blockReason = "Match is finished";
  else if (phase === "suspended") blockReason = "Match is suspended";
  else if (input.marketsSuspended) {
    blockReason = recentMaterial
      ? "Markets suspended after a material match event"
      : "Markets suspended";
  }

  const momentum = buildMatchMomentum({
    phase,
    homeName,
    awayName,
    pulses,
    oddsBiasHomeBps: input.oddsBiasHomeBps,
    series,
  });

  // Keep the graph tip aligned with the live meter (odds bias + recency weights).
  const tip = {
    minute: clock.minutes,
    balance: momentum.balance,
    tempoScore: momentum.tempoScore,
  };
  if (series.length === 0) {
    series.push({ minute: 0, balance: 0, tempoScore: 0 }, tip);
  } else {
    series[series.length - 1] = tip;
  }
  momentum.series = series;

  return {
    score,
    clock,
    gameState,
    phase,
    callsBlocked,
    blockReason,
    timeline: timeline.slice().reverse(),
    lastEventAt:
      latest?.sourceTimestamp === null || latest?.sourceTimestamp === undefined
        ? null
        : String(latest.sourceTimestamp),
    sideStats,
    firstHalfScore,
    momentum,
  };
}

export function probabilityDeltaBps(
  currentPct: string | null,
  previousPct: string | null
): number | null {
  if (currentPct === null || previousPct === null) return null;
  if (
    currentPct.trim().toUpperCase() === "NA" ||
    previousPct.trim().toUpperCase() === "NA"
  ) {
    return null;
  }
  const current = Number(currentPct);
  const previous = Number(previousPct);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return Math.round((current - previous) * 100);
}

/** Map 1X2 outcome deltas onto a home-favoring bias in bps. */
export function homeOddsBiasBps(input: {
  participant1IsHome: boolean;
  outcomes: Array<{ key: string; deltaBps: number | null }>;
}): number | null {
  const part1 = input.outcomes.find((row) => row.key === "part1");
  const part2 = input.outcomes.find((row) => row.key === "part2");
  if (!part1 && !part2) return null;
  const p1 = part1?.deltaBps ?? 0;
  const p2 = part2?.deltaBps ?? 0;
  const towardP1 = p1 - p2;
  return input.participant1IsHome ? towardP1 : -towardP1;
}
