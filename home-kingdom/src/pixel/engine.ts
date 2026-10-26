// Tiny pixel-art engine. Sprites are grids of colors; they're drawn as one SVG
// <path> per color, so even a full scene is only a few hundred bytes of DOM.

export type Grid = (string | null)[][];

export const INK = "#3b2a1e";

// Shared palette for the letter-based sprites in icons.ts.
export const PAL: Record<string, string> = {
  k: INK, e: "#2a1f17", w: "#fffaf0", c: "#f6ecd2", C: "#e3d3ad",
  y: "#f2c14e", Y: "#c98f1c", o: "#e8833a", r: "#d0503c", R: "#9c3328", p: "#f08ca8", P: "#c9607f",
  g: "#6aa84f", G: "#3f7d3a", l: "#a6d36b", b: "#5b8fd1", B: "#3a5f9e", s: "#a9d8f0",
  n: "#9b6534", N: "#6b4223", t: "#d9a066", a: "#a9b2ba", A: "#6c757e", v: "#8e6bbf", V: "#644a8f",
  f: "#f2c9a0", F: "#d9a27a",
};

export class Canvas {
  g: Grid;
  constructor(public w: number, public h: number) {
    this.g = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  }
  px(x: number, y: number, c: string | null) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: string | null) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c);
    return this;
  }
  hline(x: number, y: number, w: number, c: string) { return this.rect(x, y, w, 1, c); }
  vline(x: number, y: number, h: number, c: string) { return this.rect(x, y, 1, h, c); }
  // Stamp another grid on top (transparent cells are skipped).
  stamp(src: Grid, ox: number, oy: number) {
    src.forEach((row, y) => row.forEach((c, x) => c && this.px(ox + x, oy + y, c)));
    return this;
  }
  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.g[y][x] : null;
  }
}

// Adds a 1px dark outline around every filled shape (classic RPG look).
export function outline(g: Grid, color = INK, pad = 1): Grid {
  const h = g.length + pad * 2;
  const w = (g[0]?.length ?? 0) + pad * 2;
  const out: Grid = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  g.forEach((row, y) => row.forEach((c, x) => { if (c) out[y + pad][x + pad] = c; }));
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && out[y][x] !== null && out[y][x] !== color;
  const res = out.map((r) => r.slice());
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!out[y][x] && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) res[y][x] = color;
  return res;
}

// Letter rows → grid. "." (or space) is transparent.
export function rows(lines: string[], pal: Record<string, string> = PAL): Grid {
  return lines.map((line) => [...line].map((ch) => (ch === "." || ch === " " ? null : pal[ch] ?? null)));
}

export function swap(g: Grid, map: Record<string, string>): Grid {
  return g.map((r) => r.map((c) => (c && map[c] ? map[c] : c)));
}

export function flipX(g: Grid): Grid {
  return g.map((r) => r.slice().reverse());
}

// Grid → { color: "M0 0h3v1h-3z…" } using horizontal runs.
export function toPaths(g: Grid): [string, string][] {
  const byColor = new Map<string, string[]>();
  g.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (!c) { x++; continue; }
      let len = 1;
      while (x + len < row.length && row[x + len] === c) len++;
      const list = byColor.get(c) ?? [];
      list.push(`M${x} ${y}h${len}v1h-${len}z`);
      byColor.set(c, list);
      x += len;
    }
  });
  return [...byColor.entries()].map(([c, d]) => [c, d.join("")]);
}
