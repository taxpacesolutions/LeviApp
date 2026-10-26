import { memo, useMemo } from "react";
import { toPaths, type Grid } from "./engine";
import { icon } from "./icons";

interface Props {
  grid: Grid;
  scale?: number;
  className?: string;
  label?: string;
  style?: React.CSSProperties;
}

// Renders a pixel grid as crisp SVG. Width/height default to grid size × scale.
export const Sprite = memo(function Sprite({ grid, scale = 3, className, label, style }: Props) {
  const paths = useMemo(() => toPaths(grid), [grid]);
  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {paths.map(([c, d]) => <path key={c} fill={c} d={d} />)}
    </svg>
  );
});

export function Layer({ grid, x, y }: { grid: Grid; x: number; y: number }) {
  const paths = useMemo(() => toPaths(grid), [grid]);
  return <g transform={`translate(${x} ${y})`}>{paths.map(([c, d]) => <path key={c} fill={c} d={d} />)}</g>;
}

export function Icon({ name, size = 2, className, label }: { name: string; size?: number; className?: string; label?: string }) {
  return <Sprite grid={icon(name)} scale={size} className={className} label={label} />;
}
