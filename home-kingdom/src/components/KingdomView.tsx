import { useMemo } from "react";
import { Layer } from "../pixel/Sprite";
import { kingdomScene, SCENE_H, SCENE_W } from "../pixel/scene";
import { heroSprite } from "../pixel/hero";
import { useStore } from "../lib/store";

// The pixel kingdom, optionally with both heroes standing in front of the house.
export function KingdomView({ heroes = false, className = "" }: { heroes?: boolean; className?: string }) {
  const { data } = useStore();
  const enabled = data.unlocks.filter((u) => u.enabled);
  const roof = [...enabled].reverse().find((u) => u.key.startsWith("roof_"))?.key;
  const keys = enabled.map((u) => u.key).filter((k) => !k.startsWith("roof_"));
  const grid = useMemo(() => kingdomScene({ unlocks: keys, roof }), [keys.join(","), roof]); // eslint-disable-line react-hooks/exhaustive-deps
  const [jess, mar] = ["jessica", "mariano"].map((h) => data.profiles.find((p) => p.hero === h));
  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} shapeRendering="crispEdges" className={`block w-full ${className}`}
      role="img" aria-label="Home Kingdom">
      <Layer grid={grid} x={0} y={0} />
      {heroes && jess && (
        <g className="bob"><Layer grid={heroSprite("jessica", jess.avatar)} x={56} y={66} /></g>
      )}
      {heroes && mar && (
        <g className="bob bob-delay"><Layer grid={heroSprite("mariano", mar.avatar)} x={88} y={66} /></g>
      )}
    </svg>
  );
}
