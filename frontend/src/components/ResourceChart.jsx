import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Generic avg-vs-peak time series chart, used for CPU and Memory.
// data: [{ time, avg, peak }]
export default function ResourceChart({ title, data = [], color, unit, label = "Usage" }) {
  const avgs = data.map((d) => d.avg).filter((v) => v != null);
  const peaks = data.map((d) => d.peak).filter((v) => v != null);

  const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
  const peak = peaks.length ? Math.max(...peaks) : 0;
  const last = avgs.length ? avgs[avgs.length - 1] : 0;

  const gradientId = `resource-gradient-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Live
        </span>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#27272A" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fill: "#71717A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "#71717A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#111113",
                border: "1px solid #27272A",
                borderRadius: "8px",
                color: "#FAFAFA",
                fontSize: "13px",
              }}
              formatter={(v, name) => [`${v?.toFixed ? v.toFixed(1) : v} ${unit}`, name]}
            />

            <Area
              type="monotone"
              dataKey="avg"
              name={`Avg ${label}`}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4 }}
            />

            <Area
              type="monotone"
              dataKey="peak"
              name={`Peak ${label}`}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="transparent"
              dot={false}
              activeDot={{ r: 3 }}
              opacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-5 text-xs text-zinc-500">
        <span className="text-zinc-300">
          Avg <span className="font-mono">{avg.toFixed(1)}</span> {unit}
        </span>
        <span>
          Peak <span className="font-mono">{peak.toFixed(1)}</span> {unit}
        </span>
        <span>
          Last <span className="font-mono">{last.toFixed(1)}</span> {unit}
        </span>
      </div>
    </div>
  );
}