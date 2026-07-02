export default function StatCard({
  title,
  value,
  unit,
  icon,
  accentColor,
  comparison,
  comparisonLabel,
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border"
          style={{
            borderColor: accentColor,
            color: accentColor,
          }}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-400">{title}</p>

          <div className="mt-1 flex items-end gap-2">
            <span className="text-3xl font-semibold text-white">
              {value}
            </span>

            {unit && (
              <span className="pb-1 text-slate-400">
                {unit}
              </span>
            )}
          </div>

          {comparison && (
            <p className="mt-2 text-xs text-slate-500">
              {comparisonLabel}
              <span className="ml-1 text-red-400">
                {comparison}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}