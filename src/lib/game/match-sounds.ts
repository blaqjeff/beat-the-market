/** Browser-only match cues via Web Audio (no asset files). */

let sharedCtx: AudioContext | null = null;

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

/** Call from a click/tap so later cues can play after async fetches. */
export async function unlockMatchAudio(): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  if (ctx.state === "running") {
    const gain = ctx.createGain();
    gain.gain.value = 0.00001;
    const osc = ctx.createOscillator();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
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

/** Layered crowd roar — stadium cheer / shout swell for goals. */
function stadiumRoar(ctx: AudioContext, start: number) {
  const duration = 2.4;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, start);
  master.gain.exponentialRampToValueAtTime(0.55, start + 0.12);
  master.gain.setValueAtTime(0.5, start + 0.55);
  master.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  master.connect(ctx.destination);

  // Pink-ish noise bed (crowd mass).
  const bedLen = Math.floor(ctx.sampleRate * duration);
  const bed = ctx.createBuffer(1, bedLen, ctx.sampleRate);
  const bedData = bed.getChannelData(0);
  let pink = 0;
  for (let i = 0; i < bedLen; i += 1) {
    const white = Math.random() * 2 - 1;
    pink = 0.97 * pink + 0.03 * white;
    bedData[i] = pink * 0.9;
  }
  const bedSrc = ctx.createBufferSource();
  bedSrc.buffer = bed;
  const bedFilter = ctx.createBiquadFilter();
  bedFilter.type = "bandpass";
  bedFilter.frequency.setValueAtTime(700, start);
  bedFilter.frequency.exponentialRampToValueAtTime(1600, start + 0.35);
  bedFilter.frequency.exponentialRampToValueAtTime(900, start + 1.6);
  bedFilter.Q.value = 0.7;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.85;
  bedSrc.connect(bedFilter);
  bedFilter.connect(bedGain);
  bedGain.connect(master);
  bedSrc.start(start);
  bedSrc.stop(start + duration + 0.05);

  // Higher “shout” band — voices cutting through.
  const shoutLen = Math.floor(ctx.sampleRate * duration);
  const shout = ctx.createBuffer(1, shoutLen, ctx.sampleRate);
  const shoutData = shout.getChannelData(0);
  for (let i = 0; i < shoutLen; i += 1) {
    shoutData[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.random());
  }
  const shoutSrc = ctx.createBufferSource();
  shoutSrc.buffer = shout;
  const shoutFilter = ctx.createBiquadFilter();
  shoutFilter.type = "bandpass";
  shoutFilter.frequency.setValueAtTime(1800, start);
  shoutFilter.frequency.linearRampToValueAtTime(2400, start + 0.25);
  shoutFilter.frequency.linearRampToValueAtTime(1500, start + 1.2);
  shoutFilter.Q.value = 1.4;
  const shoutGain = ctx.createGain();
  shoutGain.gain.setValueAtTime(0.0001, start);
  shoutGain.gain.exponentialRampToValueAtTime(0.7, start + 0.08);
  shoutGain.gain.exponentialRampToValueAtTime(0.25, start + 1.1);
  shoutGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  // Tremolo so it feels like overlapping voices, not static noise.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 7.5;
  lfoGain.gain.value = 0.22;
  lfo.connect(lfoGain);
  lfoGain.connect(shoutGain.gain);
  shoutSrc.connect(shoutFilter);
  shoutFilter.connect(shoutGain);
  shoutGain.connect(master);
  lfo.start(start);
  lfo.stop(start + duration);
  shoutSrc.start(start);
  shoutSrc.stop(start + duration + 0.05);

  // Low boom under the roar (stand reaction).
  const boom = ctx.createOscillator();
  const boomGain = ctx.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(55, start);
  boom.frequency.exponentialRampToValueAtTime(42, start + 0.8);
  boomGain.gain.setValueAtTime(0.0001, start);
  boomGain.gain.exponentialRampToValueAtTime(0.35, start + 0.06);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
  boom.connect(boomGain);
  boomGain.connect(master);
  boom.start(start);
  boom.stop(start + 1.15);

  // Short rising “goal!” whistle of energy on top (not melodic chime).
  const surge = ctx.createOscillator();
  const surgeGain = ctx.createGain();
  surge.type = "sawtooth";
  surge.frequency.setValueAtTime(220, start);
  surge.frequency.exponentialRampToValueAtTime(480, start + 0.45);
  surgeGain.gain.setValueAtTime(0.0001, start);
  surgeGain.gain.exponentialRampToValueAtTime(0.12, start + 0.05);
  surgeGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
  const surgeFilter = ctx.createBiquadFilter();
  surgeFilter.type = "lowpass";
  surgeFilter.frequency.value = 900;
  surge.connect(surgeFilter);
  surgeFilter.connect(surgeGain);
  surgeGain.connect(master);
  surge.start(start);
  surge.stop(start + 0.6);
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

  if (kind === "goal") {
    stadiumRoar(ctx, t);
    return true;
  }

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
