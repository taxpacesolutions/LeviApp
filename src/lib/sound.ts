"use client";

// Tiny synthesized sound effects (no audio files to download).
// Off switch is remembered per device; nothing plays until the viewer has tapped the page.
export type SoundName = "coin" | "pop" | "levelup" | "tada" | "grow";

const KEY = "lrb-sound";
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
}

function note(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = "triangle", vol = 0.12) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

const PATTERNS: Record<SoundName, [number, number, number][]> = {
  // [frequency Hz, start offset s, duration s]
  coin: [[988, 0, 0.09], [1319, 0.08, 0.3]],
  pop: [[660, 0, 0.08], [880, 0.05, 0.1]],
  levelup: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.35]],
  tada: [[784, 0, 0.15], [988, 0.12, 0.15], [1175, 0.24, 0.15], [1568, 0.36, 0.45]],
  grow: [[392, 0, 0.12], [523, 0.12, 0.12], [659, 0.24, 0.3]],
};

export function play(name: SoundName) {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime + 0.01;
    for (const [f, off, d] of PATTERNS[name]) note(ctx, f, t + off, d);
  } catch {
    // Sound is a nice-to-have; never let it break the page.
  }
}
