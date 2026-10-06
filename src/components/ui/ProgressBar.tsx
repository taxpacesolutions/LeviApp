export function ProgressBar({ value, tone = "mint", size = "md" }: { value: number; tone?: "mint" | "brand" | "sun"; size?: "sm" | "md" | "lg" }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone === "mint" ? "bg-mint" : tone === "sun" ? "bg-sun" : "bg-brand";
  const h = size === "sm" ? "h-2" : size === "lg" ? "h-5" : "h-3";
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-canvas`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={`${h} ${color} rounded-full transition-[width] duration-700 ease-out`} style={{ width: `${Math.max(v, v > 0 ? 4 : 0)}%` }} />
    </div>
  );
}
