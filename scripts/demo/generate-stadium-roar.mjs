/**
 * Generates a stereo stadium crowd-roar WAV (procedural, no third-party assets).
 * Emphasizes low/mid rumble + vocal formants — not high-frequency hiss.
 * Run: node scripts/demo/generate-stadium-roar.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const SAMPLE_RATE = 44100;
const DURATION = 3.2;
const N = Math.floor(SAMPLE_RATE * DURATION);

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function envelope(t) {
  if (t < 0.12) return Math.pow(t / 0.12, 0.7);
  if (t < 0.7) return 0.85 + 0.15 * ((t - 0.12) / 0.58);
  if (t < 1.9) return 1;
  return Math.max(0, 1 - Math.pow((t - 1.9) / (DURATION - 1.9), 1.2));
}

function mulberry(seed) {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBrown(seed) {
  const rnd = mulberry(seed);
  let last = 0;
  return () => {
    const white = rnd() * 2 - 1;
    last = (last + white * 0.015) / 1.015;
    return last * 4.2;
  };
}

function makePink(seed) {
  const rnd = mulberry(seed);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  return () => {
    const white = rnd() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink =
      b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    return pink * 0.11;
  };
}

function lowpass(state, input, alpha) {
  state.v = state.v + alpha * (input - state.v);
  return state.v;
}

const brownL = makeBrown(11);
const brownR = makeBrown(22);
const pinkL = makePink(33);
const pinkR = makePink(44);
const voiceL = makePink(55);
const voiceR = makePink(66);

const lpDeepL = { v: 0 };
const lpDeepR = { v: 0 };
const lpBodyL = { v: 0 };
const lpBodyR = { v: 0 };
const lpVoiceL = { v: 0 };
const lpVoiceR = { v: 0 };
const lpVoice2L = { v: 0 };
const lpVoice2R = { v: 0 };

const left = new Float32Array(N);
const right = new Float32Array(N);

for (let i = 0; i < N; i += 1) {
  const t = i / SAMPLE_RATE;
  const env = envelope(t);
  const swell =
    0.78 +
    0.14 * Math.sin(2 * Math.PI * 2.2 * t) +
    0.08 * Math.sin(2 * Math.PI * 4.6 * t + 0.7);

  // Deep stadium rumble (stands / bass)
  const deepL = lowpass(lpDeepL, brownL(), 0.02) * 1.1;
  const deepR = lowpass(lpDeepR, brownR(), 0.02) * 1.1;

  // Mid body of the crowd
  const bodyL = lowpass(lpBodyL, pinkL(), 0.06) * 0.95;
  const bodyR = lowpass(lpBodyR, pinkR(), 0.06) * 0.95;

  // Shout / roar formants (still mid, not sparkly)
  const v1L = lowpass(lpVoiceL, voiceL(), 0.11);
  const v1R = lowpass(lpVoiceR, voiceR(), 0.11);
  const v2L = v1L - lowpass(lpVoice2L, v1L, 0.045);
  const v2R = v1R - lowpass(lpVoice2R, v1R, 0.045);
  const shoutL = v1L * 0.55 + v2L * 0.9;
  const shoutR = v1R * 0.55 + v2R * 0.9;

  const impact = t < 0.5 ? 1 + 0.8 * (1 - t / 0.5) : 1;

  let l = (deepL * 0.7 + bodyL * 0.55 + shoutL * 0.85) * env * swell * impact;
  let r = (deepR * 0.7 + bodyR * 0.55 + shoutR * 0.85) * env * swell * impact;

  // Soft saturating clip — denser, less “shaker”
  l = Math.tanh(l * 1.6);
  r = Math.tanh(r * 1.6);

  left[i] = clamp(l, -1, 1);
  right[i] = clamp(r, -1, 1);
}

let peak = 0;
for (let i = 0; i < N; i += 1) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const norm = peak > 0 ? 0.95 / peak : 1;
for (let i = 0; i < N; i += 1) {
  left[i] *= norm;
  right[i] *= norm;
}

function floatTo16(sample) {
  const s = clamp(sample, -1, 1);
  return s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
}

const dataSize = N * 2 * 2;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2 * 2, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let o = 44;
for (let i = 0; i < N; i += 1) {
  buffer.writeInt16LE(floatTo16(left[i]), o);
  o += 2;
  buffer.writeInt16LE(floatTo16(right[i]), o);
  o += 2;
}

const outDir = path.join(process.cwd(), "public", "sounds");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "stadium-roar.wav");
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
