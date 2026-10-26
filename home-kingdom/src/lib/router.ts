import { useEffect, useState } from "react";

// Tiny hash router: #/quests/123 → { screen: "quests", param: "123" }.
export type Screen = "home" | "quests" | "shop" | "campfire" | "kingdom";
const SCREENS: Screen[] = ["home", "quests", "shop", "campfire", "kingdom"];

function parse() {
  const [a, b] = window.location.hash.replace(/^#\/?/, "").split("/");
  const screen = (SCREENS.includes(a as Screen) ? a : "home") as Screen;
  return { screen, param: b ? decodeURIComponent(b) : null };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function go(screen: Screen, param?: string) {
  window.location.hash = `/${screen === "home" ? "" : screen}${param ? "/" + encodeURIComponent(param) : ""}`;
}
