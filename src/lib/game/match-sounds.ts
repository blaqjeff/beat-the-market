/** Match event cues — goal uses a recorded stadium-roar WAV; others are Web Audio. */

let sharedCtx: AudioContext | null = null;
let roarElement: HTMLAudioElement | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  return sharedCtx;
}

function getRoarElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!roarElement) {
    roarElement = new Audio("/sounds/stadium-roar.wav");
    roarElement.preload = "auto";
    roarElement.volume = 0.95;
  }
  return roarElement;
}

/** Call from a click/tap so later cues can play after async fetches. */
export async function unlockMatchAudio(): Promise<void> {
  const ctx = getCtx();
  if (ctx?.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  const roar = getRoarElement();
  if (roar) {
    try {
      roar.muted = true;
      await roar.play();
      roar.pause();
      roar.currentTime = 0;
      roar.muted = false;
    } catch {
      /* autoplay unlock best-effort */
    }
  }
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gainValue: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(gainValue, 0.001),
    start + 0.02
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

async function playStadiumRoar(): Promise<boolean> {
  const roar = getRoarElement();
  if (!roar) return false;
  try {
    roar.pause();
    roar.currentTime = 0;
    roar.volume = 0.95;
    await roar.play();
    return true;
  } catch {
    return false;
  }
}

export type MatchSoundKind = "goal" | "card" | "corner" | "kickoff" | "finish";

const BEAT_SOUNDS: Record<string, MatchSoundKind> = {
  kickoff: "kickoff",
  "corners-pressure": "corner",
  "france-goal": "goal",
  "england-yellow": "card",
  "england-goal": "goal",
  "france-winner": "goal",
  "full-time": "finish",
};

export function soundKindFromBeatId(
  beatId: string | null | undefined
): MatchSoundKind | null {
  if (!beatId) return null;
  return BEAT_SOUNDS[beatId] ?? null;
}

export async function playMatchSound(kind: MatchSoundKind): Promise<boolean> {
  await unlockMatchAudio();

  if (kind === "goal") {
    return playStadiumRoar();
  }

  const ctx = getCtx();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  if (ctx.state !== "running") return false;

  const t = ctx.currentTime + 0.02;

  if (kind === "card") {
    tone(ctx, 180, t, 0.1, "square", 0.16);
    tone(ctx, 140, t + 0.1, 0.18, "square", 0.14);
    return true;
  }

  if (kind === "corner") {
    tone(ctx, 440, t, 0.1, "sine", 0.16);
    tone(ctx, 554, t + 0.09, 0.12, "sine", 0.16);
    return true;
  }

  if (kind === "kickoff") {
    tone(ctx, 620, t, 0.08, "sine", 0.18);
    tone(ctx, 620, t + 0.14, 0.08, "sine", 0.18);
    return true;
  }

  if (kind === "finish") {
    tone(ctx, 330, t, 0.22, "triangle", 0.22);
    tone(ctx, 392, t + 0.18, 0.24, "triangle", 0.22);
    tone(ctx, 523.25, t + 0.36, 0.45, "triangle", 0.24);
    return true;
  }

  return false;
}

export function soundKindFromTimeline(
  kind: string | undefined,
  action?: string
): MatchSoundKind | null {
  if (kind === "goal") return "goal";
  if (kind === "card") return "card";
  if (kind === "corner") return "corner";
  if (kind === "kickoff") return "kickoff";
  if (kind === "finish") return "finish";
  const a = (action ?? "").toLowerCase();
  if (a.includes("goal") && !a.includes("goalscorer")) return "goal";
  if (a.includes("yellow") || a.includes("red") || a.includes("card")) {
    return "card";
  }
  if (a.includes("corner")) return "corner";
  if (a.includes("kick_off") || a.includes("kickoff")) return "kickoff";
  if (a.includes("final") || a.includes("full_time")) return "finish";
  return null;
}
