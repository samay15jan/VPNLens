export default function StatCard({
  title,
  value,
  unit,
  icon,
  accentColor,
  comparison,
  comparisonLabel,
}) {
  const comparisonIsRegression =
    typeof comparison === "string" && comparison.trim().startsWith("+");

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </p>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-3xl font-semibold tracking-tight text-zinc-50">
          {value}
        </span>
        {unit && (
          <span className="pb-0.5 text-sm text-zinc-500">{unit}</span>
        )}
      </div>

      {comparison && (
        <p className="mt-2 text-xs text-zinc-500">
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
