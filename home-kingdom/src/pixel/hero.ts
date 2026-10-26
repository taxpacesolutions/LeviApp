import type { Avatar, Hero } from "../lib/types";
import { Canvas, outline, type Grid } from "./engine";

export const HAIR_STYLES = ["short", "long", "bun", "ponytail", "curly", "spiky"] as const;
export const HATS = ["none", "bandana", "cap", "hardhat", "flowers"] as const;
export const ACCESSORIES = ["none", "clipboard", "hammer", "wrench", "book", "flower"] as const;
export const STYLES = ["tunic", "dress"] as const;

export const HAIR_COLORS: Record<string, string> = {
  brown: "#7a4a2a", black: "#2f2622", blonde: "#e2b857", red: "#b5512f", gray: "#b8b2a8", blue: "#4a6fb5",
};
export const SKINS: Record<string, string> = {
  light: "#f6d2b0", medium: "#e7b48a", tan: "#c98d5f", brown: "#9c6440", deep: "#6e4428",
};
export const OUTFITS: Record<string, string> = {
  rose: "#d9667f", blue: "#4f7cac", green: "#5e9e57", purple: "#8b6bbf", orange: "#e08a3a", teal: "#3f9e9a",
};

export const DEFAULT_AVATARS: Record<Hero, Required<Avatar> & { style: string }> = {
  jessica: { hair: "long", hairColor: "brown", skin: "light", outfit: "rose", accessory: "clipboard", hat: "none", style: "dress" },
  mariano: { hair: "short", hairColor: "black", skin: "tan", outfit: "blue", accessory: "hammer", hat: "bandana", style: "tunic" },
};

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const cache = new Map<string, Grid>();

// 14×21 hero (16×23 with outline). Original design: chibi adventurer.
export function heroSprite(hero: Hero, avatar: Avatar & { style?: string } = {}): Grid {
  const a = { ...DEFAULT_AVATARS[hero], ...avatar } as Required<Avatar> & { style: string };
  const key = JSON.stringify(a);
  const hit = cache.get(key);
  if (hit) return hit;

  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS.brown;
  const hairD = shade(hair, 0.75);
  const skin = SKINS[a.skin] ?? SKINS.light;
  const cloth = OUTFITS[a.outfit] ?? OUTFITS.blue;
  const clothD = shade(cloth, 0.75);
  const clothL = shade(cloth, 1.25);
  const pants = "#5b4a3a";
  const boots = "#6b4223";
  const c = new Canvas(14, 21);
  const Y = 2; // head room for hats and buns

  // Hair that falls behind the body.
  if (a.hair === "long") { c.rect(1, Y + 3, 2, 8, hair); c.rect(11, Y + 3, 2, 8, hair); c.vline(1, Y + 10, 1, hairD); c.vline(12, Y + 10, 1, hairD); }
  if (a.hair === "ponytail") { c.rect(12, Y + 2, 2, 2, hair); c.rect(12, Y + 4, 1, 4, hair); c.px(13, Y + 4, hairD); }
  if (a.hair === "curly") { c.rect(1, Y + 3, 2, 5, hair); c.rect(11, Y + 3, 2, 5, hair); c.px(1, Y + 8, hairD); c.px(12, Y + 8, hairD); }

  // Legs and boots.
  c.rect(4, Y + 15, 2, 3, pants); c.rect(8, Y + 15, 2, 3, pants);
  c.rect(3, Y + 18, 3, 1, boots); c.rect(8, Y + 18, 3, 1, boots);

  // Body.
  c.rect(3, Y + 9, 8, 5, cloth);
  c.rect(4, Y + 9, 6, 1, clothL);
  c.px(6, Y + 10, clothL); c.px(7, Y + 10, clothL);
  c.rect(2, Y + 9, 1, 3, cloth); c.rect(11, Y + 9, 1, 3, cloth);
  c.px(2, Y + 12, skin); c.px(11, Y + 12, skin);
  if (a.style === "dress") {
    c.rect(3, Y + 13, 8, 1, cloth); c.rect(2, Y + 14, 10, 1, clothD);
    c.rect(3, Y + 12, 8, 1, clothD);
  } else {
    c.rect(3, Y + 12, 8, 1, "#6b4223"); c.px(7, Y + 12, "#f2c14e");
    c.rect(3, Y + 13, 8, 2, clothD);
    c.rect(6, Y + 14, 2, 1, null);
  }

  // Head.
  c.rect(3, Y + 3, 8, 6, skin);
  c.px(5, Y + 5, "#2a1f17"); c.px(5, Y + 6, "#2a1f17");
  c.px(8, Y + 5, "#2a1f17"); c.px(8, Y + 6, "#2a1f17");
  c.px(4, Y + 7, "#f08ca8"); c.px(9, Y + 7, "#f08ca8");
  c.px(6, Y + 7, "#9c3328"); c.px(7, Y + 7, "#9c3328");

  // Hair on top.
  c.rect(3, Y, 8, 1, hair); c.rect(2, Y + 1, 10, 2, hair);
  c.rect(3, Y + 3, 3, 1, hair); c.px(10, Y + 3, hair); c.px(9, Y + 3, hairD);
  c.vline(2, Y + 3, a.hair === "short" || a.hair === "spiky" ? 2 : 4, hair);
  c.vline(11, Y + 3, a.hair === "short" || a.hair === "spiky" ? 2 : 4, hair);
  c.hline(4, Y + 1, 3, shade(hair, 1.2));
  if (a.hair === "bun") { c.rect(5, Y - 2, 4, 2, hair); c.hline(6, Y - 2, 2, shade(hair, 1.2)); }
  if (a.hair === "spiky") { c.px(4, Y - 1, hair); c.px(7, Y - 1, hair); c.px(10, Y - 1, hair); c.px(3, Y - 1, null); }
  if (a.hair === "curly") { c.rect(2, Y, 10, 1, hair); c.px(1, Y + 2, hair); c.px(12, Y + 2, hair); }

  // Hats.
  if (a.hat === "bandana") { c.rect(2, Y + 1, 10, 2, "#c8553d"); c.hline(3, Y + 1, 4, "#e07a62"); c.px(12, Y + 2, "#c8553d"); c.px(13, Y + 3, "#9c3328"); }
  if (a.hat === "cap") { c.rect(3, Y - 1, 8, 3, "#4f7cac"); c.hline(4, Y - 1, 3, "#7aa2cf"); c.rect(1, Y + 2, 7, 1, "#3a5f9e"); }
  if (a.hat === "hardhat") { c.rect(3, Y - 1, 8, 3, "#f2c14e"); c.hline(4, Y - 1, 3, "#fbe08a"); c.vline(7, Y - 1, 3, "#c98f1c"); c.rect(1, Y + 2, 12, 1, "#c98f1c"); }
  if (a.hat === "flowers") { c.px(3, Y, "#f08ca8"); c.px(6, Y - 1, "#fffaf0"); c.px(6, Y, "#f2c14e"); c.px(9, Y, "#f08ca8"); c.px(11, Y + 1, "#8e6bbf"); }

  // Held item (right hand).
  if (a.accessory === "clipboard") { c.rect(11, Y + 10, 3, 4, "#c8995a"); c.rect(12, Y + 11, 1, 2, "#fffaf0"); c.px(12, Y + 10, "#a9b2ba"); }
  if (a.accessory === "hammer") { c.vline(12, Y + 7, 6, "#9b6534"); c.rect(11, Y + 6, 3, 2, "#a9b2ba"); c.px(13, Y + 7, "#6c757e"); }
  if (a.accessory === "wrench") { c.vline(12, Y + 8, 5, "#a9b2ba"); c.px(11, Y + 7, "#a9b2ba"); c.px(13, Y + 7, "#a9b2ba"); }
  if (a.accessory === "book") { c.rect(11, Y + 10, 3, 3, "#3a5f9e"); c.vline(12, Y + 10, 3, "#fffaf0"); }
  if (a.accessory === "flower") { c.vline(12, Y + 8, 4, "#3f7d3a"); c.px(12, Y + 7, "#f2c14e"); c.px(11, Y + 7, "#f08ca8"); c.px(13, Y + 7, "#f08ca8"); c.px(12, Y + 6, "#f08ca8"); }

  const g = outline(c.g);
  cache.set(key, g);
  return g;
}
