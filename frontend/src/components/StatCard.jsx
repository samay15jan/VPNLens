export default function StatCard({
  title,
  value,
  unit,
  icon,
  accentColor = "#3b82f6",
  comparison,
  comparisonLabel,
}) {
  const comparisonIsRegression =
    typeof comparison === "string" && comparison.trim().startsWith("+");

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-zinc-700"
      style={{ borderTopColor: `${accentColor}55`, borderTopWidth: "2px" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-10 h-24 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: `${accentColor}22` }}
      />

      <div className="relative flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </p>
        {icon && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="relative mt-3 flex items-end gap-1.5">
        <span className="text-3xl font-semibold tracking-tight text-zinc-50">
          {value}
        </span>
        {unit && (
          <span className="pb-0.5 text-sm text-zinc-500">{unit}</span>
        )}
      </div>

      {comparison && (
        <p className="relative mt-2 text-xs text-zinc-500">
          {comparisonLabel}{" "}
          <span
            className={
              comparisonIsRegression ? "text-amber-500" : "text-zinc-400"
            }
          >
            {comparison}
          </span>
        </p>
      )}
    </div>
  );
}