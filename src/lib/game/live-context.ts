/** TxLINE soccer Stats: (period * 1000) + baseKey; 1/2 = P1/P2 goals. */
const TOTAL_GOALS_P1 = 1;
const TOTAL_GOALS_P2 = 2;

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

export interface TimelineEvent {
  sequence: number;
  action: string;
  gameState: string | null;
  sourceTimestamp: string | null;
  homeScore: number | null;
  awayScore: number | null;
  matchMinute: number | null;
  summary: string;
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
  const record = asRecord(stats);
  const p1 =
    numberFromUnknown(record[String(TOTAL_GOALS_P1)] ?? record[TOTAL_GOALS_P1]) ??
    0;
  const p2 =
    numberFromUnknown(record[String(TOTAL_GOALS_P2)] ?? record[TOTAL_GOALS_P2]) ??
    0;
  return {
    participant1: p1,
    participant2: p2,
    home: participant1IsHome ? p1 : p2,
    away: participant1IsHome ? p2 : p1,
  };
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
}): LiveBoard {
  const ordered = [...input.events].sort((a, b) => a.sequence - b.sequence);
  let score = goalsFromStats({}, input.participant1IsHome);
  let clock = clockFromPayload({});
  const timeline: TimelineEvent[] = [];

  for (const event of ordered) {
    const eventScore = goalsFromStats(event.stats, input.participant1IsHome);
    const hasStats =
      event.stats &&
      typeof event.stats === "object" &&
      Object.keys(asRecord(event.stats)).length > 0;
    if (hasStats) {
      score = eventScore;
    }
    const eventClock = clockFromPayload(event.rawPayload ?? event.data);
    if (
      eventClock.seconds !== null ||
      eventClock.minutes !== null ||
      eventClock.display
    ) {
      clock = eventClock;
    }

    const summaryParts = [event.action];
    if (hasStats) {
      summaryParts.push(`${score.home}-${score.away}`);
    }
    if (eventClock.display) {
      summaryParts.push(eventClock.display);
    }

    timeline.push({
      sequence: event.sequence,
      action: event.action,
      gameState: event.gameState,
      sourceTimestamp:
        event.sourceTimestamp === null || event.sourceTimestamp === undefined
          ? null
          : String(event.sourceTimestamp),
      homeScore: hasStats ? score.home : null,
      awayScore: hasStats ? score.away : null,
      matchMinute: eventClock.minutes,
      summary: summaryParts.join(" · "),
    });
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
