import { Canvas, outline, type Grid } from "./engine";

// The kingdom: a 160×100 pixel scene. Each unlock key adds or upgrades one
// element. Everything is drawn from rectangles; no image files.

export const SCENE_W = 160;
export const SCENE_H = 100;

const C = {
  sky: "#a9d8f0", skyL: "#c7e7f6", cloud: "#fffaf0", sun: "#f9d56e",
  hill: "#8cc46a", grass: "#7fb35b", grassD: "#5f9a45", grassL: "#9cc978",
  dirt: "#d9b27c", dirtD: "#b88f5c", stone: "#b9b6ad", stoneD: "#8d8a82",
  wall: "#f6ecd2", wallD: "#e3d3ad", beam: "#8b5a2b", glass: "#7fb7e0", glassL: "#cde8f7",
  wood: "#9b6534", woodD: "#6b4223", woodL: "#c08a52", red: "#c8553d", redD: "#9c3328",
  gray: "#a9b2ba", grayD: "#6c757e", white: "#fffaf0", gold: "#f2c14e", goldD: "#c98f1c",
  leaf: "#4f8f3f", leafD: "#3a6f30", leafL: "#79b85a", pink: "#f08ca8", purple: "#8e6bbf", yellow: "#f2d34e",
  water: "#6fb3e0", waterL: "#b8e0f5", teal: "#3f9e9a",
};
const ROOFS: Record<string, [string, string, string]> = {
  red: ["#c8553d", "#9c3328", "#e07a62"],
  roof_blue: ["#4f7cac", "#3a5f9e", "#7aa2cf"],
  roof_green: ["#5e9e57", "#3f7d3a", "#86c27a"],
};

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function obj(w: number, h: number, draw: (c: Canvas) => void): Grid {
  const c = new Canvas(w, h);
  draw(c);
  return outline(c.g);
}

// --------------------------------------------------------------- objects ----

function house(roofKey: string, door: boolean, boxes: boolean, mat: boolean) {
  const [roof, roofD, roofL] = ROOFS[roofKey] ?? ROOFS.red;
  return obj(54, 50, (c) => {
    // Chimney.
    c.rect(38, 4, 6, 12, C.stone); c.rect(38, 4, 6, 2, C.stoneD); c.px(40, 8, C.stoneD); c.px(42, 11, C.stoneD);
    // Roof (stepped triangle with shingle rows).
    for (let r = 0; r < 22; r++) {
      const half = Math.min(27, 3 + Math.floor(r * 1.15));
      const color = r % 4 === 3 ? roofD : roof;
      c.hline(27 - half, r, half * 2, color);
      c.px(27 - half, r, roofL);
    }
    for (let r = 1; r < 22; r += 4) {
      const half = Math.min(27, 3 + Math.floor((r + 1) * 1.15));
      for (let x = 8; x < 48; x += 7) {
        const px = x + (r % 8 === 1 ? 3 : 0);
        if (Math.abs(px - 27) < half - 1) c.px(px, r + 1, roofD);
      }
    }
    // Walls with timber frame.
    c.rect(3, 22, 48, 28, C.wall);
    c.rect(3, 22, 48, 2, C.wallD);
    c.vline(3, 22, 28, C.beam); c.vline(50, 22, 28, C.beam); c.hline(3, 35, 48, C.beam);
    // Windows.
    for (const wx of [8, 37]) {
      c.rect(wx, 26, 10, 8, C.glass); c.rect(wx + 1, 27, 3, 2, C.glassL);
      c.vline(wx + 5, 26, 8, C.white); c.hline(wx, 30, 10, C.white);
      c.rect(wx - 1, 34, 12, 1, C.woodD);
      if (boxes) {
        c.rect(wx - 1, 35, 12, 3, C.wood);
        for (let i = 0; i < 6; i++) c.px(wx + i * 2, 34, i % 2 ? C.pink : C.yellow);
        c.hline(wx, 35, 10, C.leaf);
      }
    }
    // Door.
    const dc = door ? C.teal : C.wood;
    c.rect(21, 32, 12, 18, C.woodD);
    c.rect(22, 33, 10, 17, dc);
    c.vline(27, 33, 17, door ? "#2f7c79" : C.woodD);
    c.px(30, 42, C.gold);
    if (door) {
      // Wreath.
      c.rect(25, 35, 5, 1, C.leaf); c.rect(24, 36, 1, 3, C.leaf); c.rect(30, 36, 1, 3, C.leaf); c.rect(25, 39, 5, 1, C.leaf);
      c.px(27, 39, C.red);
      c.rect(23, 33, 8, 1, "#5fc2be");
    }
    if (mat) c.rect(20, 49, 14, 1, C.red);
  });
}

function bannerFlag() {
  return obj(12, 12, (c) => {
    c.vline(0, 0, 12, C.woodD);
    c.rect(1, 1, 9, 5, C.purple); c.rect(1, 1, 9, 1, "#a98ad6");
    c.px(10, 2, C.purple); c.px(10, 4, C.purple); c.px(11, 3, C.purple);
    c.px(4, 3, C.gold); c.px(5, 3, C.gold); c.px(4, 4, C.gold); c.px(5, 2, C.gold);
  });
}

function shed() {
  return obj(24, 22, (c) => {
    for (let r = 0; r < 8; r++) c.hline(11 - Math.floor(r * 1.5), r, 2 + Math.floor(r * 3), r % 3 === 2 ? C.woodD : C.wood);
    c.rect(1, 8, 22, 14, C.woodL);
    for (let x = 3; x < 22; x += 4) c.vline(x, 8, 14, C.wood);
    c.rect(8, 11, 8, 11, C.woodD); c.rect(9, 12, 6, 10, C.wood); c.px(14, 16, C.gold);
  });
}

function barn() {
  return obj(36, 32, (c) => {
    for (let r = 0; r < 12; r++) c.hline(17 - Math.floor(r * 1.5), r, 2 + Math.floor(r * 3), r % 4 === 3 ? C.redD : C.red);
    c.rect(0, 12, 36, 20, C.red);
    c.hline(0, 12, 36, C.redD);
    for (let x = 3; x < 34; x += 5) c.vline(x, 13, 19, C.redD);
    c.rect(11, 17, 14, 15, C.white); c.rect(12, 18, 12, 14, C.redD);
    for (let i = 0; i < 12; i++) { c.px(12 + i, 18 + i, C.white); c.px(23 - i, 18 + i, C.white); }
    c.rect(15, 5, 6, 5, C.white); c.rect(16, 6, 4, 3, C.woodD);
  });
}

function garage(upgraded: boolean) {
  return obj(38, 28, (c) => {
    c.rect(0, 0, 38, 4, upgraded ? C.teal : C.grayD);
    c.hline(0, 0, 38, upgraded ? "#5fc2be" : C.gray);
    c.rect(1, 4, 36, 24, upgraded ? C.wall : C.stone);
    if (!upgraded) {
      for (let y = 6; y < 28; y += 4) for (let x = (y / 4) % 2 ? 2 : 5; x < 36; x += 7) c.hline(x, y, 3, C.stoneD);
      c.rect(8, 10, 22, 18, C.grayD);
      for (let y = 12; y < 28; y += 3) c.hline(9, y, 20, C.gray);
    } else {
      // Office/workshop: big window, glass door, sign and plant.
      c.rect(4, 9, 14, 10, C.glass); c.rect(5, 10, 4, 3, C.glassL); c.vline(11, 9, 10, C.white);
      c.rect(3, 19, 16, 1, C.woodD);
      c.rect(22, 9, 11, 19, C.woodD); c.rect(23, 10, 9, 18, C.glass); c.rect(24, 11, 3, 4, C.glassL);
      c.px(30, 19, C.gold);
      c.rect(10, 1, 18, 3, C.woodL); c.hline(12, 2, 3, C.woodD); c.hline(17, 2, 2, C.woodD); c.hline(21, 2, 4, C.woodD);
      c.rect(4, 22, 4, 6, C.woodD); c.rect(3, 19, 6, 3, C.leaf); c.px(5, 18, C.leafL);
    }
  });
}

function bush(seed = 1) {
  const r = rand(seed);
  return obj(12, 8, (c) => {
    c.rect(1, 2, 10, 6, C.leaf); c.rect(3, 0, 6, 2, C.leaf);
    c.rect(2, 1, 3, 2, C.leafL);
    for (let i = 0; i < 4; i++) c.px(1 + Math.floor(r() * 10), 3 + Math.floor(r() * 5), C.leafD);
  });
}

function tree() {
  return obj(18, 30, (c) => {
    c.rect(7, 18, 4, 12, C.woodD); c.vline(8, 18, 12, C.wood);
    c.rect(2, 4, 14, 14, C.leaf); c.rect(4, 1, 10, 3, C.leaf); c.rect(0, 8, 18, 7, C.leaf);
    c.rect(4, 2, 5, 3, C.leafL); c.rect(2, 6, 4, 3, C.leafL);
    for (const [x, y] of [[12, 6], [5, 12], [14, 12], [9, 15], [10, 9]]) c.px(x, y, C.leafD);
    for (const [x, y] of [[6, 7], [13, 10], [3, 13]]) c.px(x, y, C.red);
  });
}

function flowers(w: number, seed: number, colors = [C.pink, C.yellow, C.purple, C.white, C.red]) {
  const r = rand(seed);
  return obj(w, 5, (c) => {
    c.rect(0, 3, w, 2, C.leaf);
    for (let x = 0; x < w; x += 2) {
      const col = colors[Math.floor(r() * colors.length)];
      const y = r() > 0.5 ? 1 : 2;
      c.px(x, y, col); c.px(x, y + 1, C.leafD);
      if (r() > 0.6) c.px(x + 1, y - 1 < 0 ? 0 : y - 1, col);
    }
  });
}

function potPlant() {
  return obj(5, 7, (c) => {
    c.rect(1, 0, 3, 3, C.leaf); c.px(0, 1, C.leaf); c.px(4, 1, C.leaf); c.px(2, 0, C.pink);
    c.rect(0, 3, 5, 4, "#c0623b"); c.hline(0, 3, 5, "#d97a52");
  });
}

function deck() {
  return obj(36, 10, (c) => {
    c.rect(0, 0, 36, 7, C.woodL);
    for (let y = 1; y < 7; y += 2) c.hline(0, y, 36, C.wood);
    for (let x = 6; x < 36; x += 9) c.px(x, (x / 3) % 2 ? 2 : 4, C.woodD);
    c.rect(1, 7, 2, 3, C.woodD); c.rect(33, 7, 2, 3, C.woodD); c.rect(17, 7, 2, 3, C.woodD);
  });
}

function lamp() {
  return obj(5, 18, (c) => {
    c.rect(0, 0, 5, 1, C.grayD); c.rect(0, 1, 5, 4, C.yellow); c.rect(1, 2, 3, 2, "#fff3b0"); c.rect(0, 5, 5, 1, C.grayD);
    c.rect(2, 6, 1, 10, C.grayD); c.rect(1, 16, 3, 2, C.grayD);
  });
}

function fence(w: number, gapFrom: number, gapTo: number) {
  return (() => {
    const c = new Canvas(w, 8);
    for (let x = 0; x < w; x++) {
      if (x >= gapFrom && x < gapTo) continue;
      if (x % 4 === 1) { c.rect(x, 1, 2, 7, C.white); c.px(x, 0, C.white); }
      if (x % 4 === 0 || x % 4 === 3) { c.px(x, 3, C.white); c.px(x, 5, C.white); }
    }
    return outline(c.g);
  })();
}

function toolRack() {
  return obj(16, 12, (c) => {
    c.rect(0, 0, 16, 7, C.woodL); c.rect(0, 0, 16, 1, C.wood);
    c.vline(3, 1, 4, C.grayD); c.rect(2, 1, 3, 1, C.gray);
    c.vline(7, 1, 5, C.wood); c.rect(6, 1, 3, 2, C.gray);
    c.vline(11, 2, 4, C.gray); c.px(10, 1, C.gray); c.px(12, 1, C.gray);
    c.px(14, 2, C.red); c.px(14, 3, C.red);
    c.rect(0, 7, 16, 2, C.wood); c.rect(1, 9, 2, 3, C.woodD); c.rect(13, 9, 2, 3, C.woodD);
    c.rect(5, 6, 4, 1, C.red);
  });
}

function cart() {
  return obj(18, 11, (c) => {
    c.rect(1, 1, 14, 5, C.wood); c.hline(1, 1, 14, C.woodL); c.hline(1, 3, 14, C.woodD);
    c.rect(2, 0, 3, 1, C.gray); c.rect(8, 0, 4, 1, C.gold);
    c.hline(15, 3, 3, C.woodD);
    for (const wx of [2, 10]) { c.rect(wx, 6, 5, 5, C.woodD); c.rect(wx + 1, 7, 3, 3, C.wood); c.px(wx + 2, 8, C.gray); }
  });
}

function chest() {
  return obj(12, 9, (c) => {
    c.rect(0, 0, 12, 3, C.wood); c.hline(1, 0, 10, C.woodL);
    c.rect(0, 3, 12, 6, C.woodD); c.hline(0, 3, 12, C.gold);
    c.rect(5, 2, 2, 3, C.gold); c.px(5, 4, C.goldD);
    c.vline(0, 0, 9, C.gold); c.vline(11, 0, 9, C.gold);
  });
}

function bench() {
  return obj(16, 8, (c) => {
    c.rect(0, 0, 16, 2, C.wood); c.hline(0, 0, 16, C.woodL);
    c.rect(0, 3, 16, 2, C.wood); c.rect(1, 5, 2, 3, C.woodD); c.rect(13, 5, 2, 3, C.woodD);
    c.rect(1, 2, 1, 1, C.woodD); c.rect(14, 2, 1, 1, C.woodD);
  });
}

function mailbox() {
  return obj(8, 12, (c) => {
    c.rect(0, 0, 7, 5, C.red); c.hline(1, 0, 5, "#e07a62"); c.rect(1, 2, 4, 1, C.redD);
    c.rect(7, 0, 1, 3, C.gold);
    c.rect(3, 5, 2, 7, C.woodD);
  });
}

function fountain() {
  return obj(22, 14, (c) => {
    c.rect(0, 8, 22, 6, C.stone); c.hline(0, 8, 22, C.white); c.hline(0, 12, 22, C.stoneD);
    c.rect(2, 9, 18, 2, C.water); c.hline(4, 9, 6, C.waterL);
    c.rect(9, 3, 4, 6, C.stone); c.rect(7, 2, 8, 2, C.stone); c.hline(7, 2, 8, C.white);
    c.px(10, 0, C.waterL); c.px(11, 0, C.waterL); c.px(9, 1, C.water); c.px(12, 1, C.water);
    c.px(6, 4, C.waterL); c.px(15, 4, C.waterL); c.px(5, 6, C.water); c.px(16, 6, C.water);
  });
}

function cat() {
  return obj(9, 7, (c) => {
    c.px(0, 0, C.dirtD); c.px(2, 0, C.dirtD);
    c.rect(0, 1, 3, 3, "#e8a25a"); c.px(0, 2, "#2a1f17"); c.px(2, 2, "#2a1f17");
    c.rect(2, 3, 5, 3, "#e8a25a"); c.hline(3, 4, 3, "#c97f3a"); c.rect(2, 6, 1, 1, "#e8a25a"); c.rect(6, 6, 1, 1, "#e8a25a");
    c.px(7, 2, "#e8a25a"); c.px(8, 1, "#e8a25a");
  });
}

function dog() {
  return obj(12, 9, (c) => {
    c.rect(0, 1, 4, 4, "#c9a27a"); c.px(0, 0, "#8a6440"); c.px(0, 2, "#2a1f17"); c.px(2, 2, "#2a1f17");
    c.px(-1, 3, "#2a1f17"); c.rect(0, 4, 2, 1, "#2a1f17");
    c.rect(3, 3, 7, 4, "#c9a27a"); c.rect(5, 3, 3, 2, "#8a6440");
    c.rect(3, 7, 1, 2, "#c9a27a"); c.rect(8, 7, 1, 2, "#c9a27a");
    c.px(10, 2, "#c9a27a"); c.px(11, 1, "#c9a27a"); c.rect(3, 2, 1, 1, C.red);
  });
}

// ----------------------------------------------------------------- scene ----

export interface SceneOptions { unlocks: string[]; roof?: string }

const cache = new Map<string, Grid>();

export function kingdomScene({ unlocks, roof }: SceneOptions): Grid {
  const has = new Set(unlocks);
  const key = [...has].sort().join(",") + "|" + (roof ?? "");
  const hit = cache.get(key);
  if (hit) return hit;

  const c = new Canvas(SCENE_W, SCENE_H);
  const r = rand(7);

  // Sky, sun, clouds, hills, grass.
  c.rect(0, 0, SCENE_W, 40, C.sky);
  c.rect(0, 0, SCENE_W, 8, C.skyL);
  c.rect(140, 6, 10, 10, C.sun); c.rect(139, 8, 12, 6, C.sun); c.rect(142, 5, 6, 12, C.sun);
  for (const [x, y, w] of [[12, 10, 18], [104, 6, 14], [56, 4, 10]]) {
    c.rect(x, y, w, 4, C.cloud); c.rect(x + 3, y - 2, w - 8, 2, C.cloud); c.rect(x + 2, y + 4, w - 4, 1, C.skyL);
  }
  for (let x = 0; x < SCENE_W; x++) {
    const h = Math.round(4 + 3 * Math.sin(x / 13) + 2 * Math.sin(x / 5.3));
    c.vline(x, 38 - h, h, C.hill);
  }
  c.rect(0, 38, SCENE_W, SCENE_H - 38, C.grass);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * SCENE_W), y = 42 + Math.floor(r() * 56);
    c.px(x, y, C.grassD); c.px(x + 1, y - 1, C.grassD);
    if (i % 3 === 0) c.px(x + 3, y + 1, C.grassL);
  }

  // Ground: paths.
  const stone = has.has("stone_path");
  const pathColor = stone ? C.stone : C.dirt;
  const pathDark = stone ? C.stoneD : C.dirtD;
  for (let y = 84; y < SCENE_H; y++) {
    const spread = Math.floor((y - 84) / 3);
    c.hline(72 - spread, y, 16 + spread * 2, pathColor);
  }
  c.rect(72, 63, 16, 21, pathColor);
  for (let y = 64; y < SCENE_H; y += 3) for (let x = 73 + (y % 2); x < 87; x += 5) c.hline(x, y, 2, pathDark);
  if (has.has("wide_road")) {
    c.rect(112, 64, 42, SCENE_H - 64, C.stone);
    for (let y = 66; y < SCENE_H; y += 4) for (let x = 114 + (y % 8 ? 0 : 3); x < 152; x += 6) c.hline(x, y, 3, C.stoneD);
  } else {
    c.rect(124, 64, 18, SCENE_H - 64, C.dirt);
    for (let y = 66; y < SCENE_H; y += 4) c.hline(126 + (y % 8 ? 0 : 6), y, 3, C.dirtD);
  }

  // Back row: buildings.
  if (has.has("barn")) c.stamp(barn(), 4, 31); else c.stamp(shed(), 10, 41);
  if (has.has("tree")) c.stamp(tree(), 40, 34);
  c.stamp(garage(has.has("workshop")), 114, 36);
  c.stamp(house(roof ?? "red", has.has("door"), has.has("window_boxes"), has.has("welcome_mat")), 53, 14);
  if (has.has("banner")) c.stamp(bannerFlag(), 79, 2);

  // Front of the house.
  c.stamp(bush(3), 42, 57); c.stamp(bush(5), 104, 57);
  if (has.has("garden")) { c.stamp(flowers(16, 11), 56, 60); c.stamp(flowers(16, 23), 89, 60); }
  if (has.has("welcome_mat")) { c.stamp(potPlant(), 66, 57); c.stamp(potPlant(), 89, 57); }
  if (has.has("cat")) c.stamp(cat(), 92, 64);

  // Yard.
  if (has.has("deck")) c.stamp(deck(), 4, 64);
  if (has.has("tool_rack")) c.stamp(toolRack(), 114, 66);
  if (has.has("cart")) c.stamp(cart(), 136, 66);
  if (has.has("lamps")) { c.stamp(lamp(), 64, 66); c.stamp(lamp(), 91, 66); }
  if (has.has("flowerbed")) { c.stamp(flowers(20, 41), 10, 80); c.stamp(flowers(12, 43), 44, 86); }
  if (has.has("bench")) c.stamp(bench(), 40, 74);
  if (has.has("fountain")) c.stamp(fountain(), 98, 72);
  if (has.has("chest")) c.stamp(chest(), 140, 82);
  if (has.has("dog")) c.stamp(dog(), 56, 78);
  if (has.has("mailbox")) c.stamp(mailbox(), 92, 82);
  if (has.has("fence")) c.stamp(fence(SCENE_W, 70, 90), -1, 91);

  const g = c.g;
  cache.set(key, g);
  return g;
}

// Small standalone previews used by shop cards and the unlock list.
export function unlockPreview(key: string): Grid {
  switch (key) {
    case "workshop": return garage(true);
    case "garden": case "flowerbed": return flowers(16, 11);
    case "door": return obj(14, 19, (c) => { c.rect(0, 0, 14, 19, C.woodD); c.rect(1, 1, 12, 18, C.teal); c.px(10, 10, C.gold); c.rect(4, 4, 6, 1, C.leaf); c.rect(4, 8, 6, 1, C.leaf); c.vline(3, 5, 3, C.leaf); c.vline(10, 5, 3, C.leaf); c.px(6, 8, C.red); });
    case "window_boxes": return obj(12, 12, (c) => { c.rect(0, 0, 12, 8, C.glass); c.vline(6, 0, 8, C.white); c.hline(0, 4, 12, C.white); c.rect(0, 8, 12, 4, C.wood); for (let i = 0; i < 6; i++) c.px(i * 2, 8, i % 2 ? C.pink : C.yellow); });
    case "welcome_mat": return potPlant();
    case "banner": return bannerFlag();
    case "tool_rack": return toolRack();
    case "cart": return cart();
    case "barn": return barn();
    case "lamps": return lamp();
    case "stone_path": case "wide_road": return obj(16, 10, (c) => { c.rect(0, 0, 16, 10, C.stone); for (let y = 1; y < 10; y += 3) for (let x = y % 2; x < 16; x += 5) c.hline(x, y, 3, C.stoneD); });
    case "deck": return deck();
    case "fence": return fence(20, 99, 99);
    case "chest": return chest();
    case "tree": return tree();
    case "bench": return bench();
    case "mailbox": return mailbox();
    case "roof_blue": case "roof_green": {
      const [a, b] = ROOFS[key];
      return obj(20, 10, (c) => { for (let r = 0; r < 10; r++) c.hline(9 - r, r, 2 + r * 2, r % 3 === 2 ? b : a); });
    }
    case "cat": return cat();
    case "dog": return dog();
    case "fountain": return fountain();
    default: return chest();
  }
}
