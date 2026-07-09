import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function LatencyChart({ data = [], title, color }) {
  const values = data.map((d) => d.latency).filter((v) => v != null);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const last = values.length ? values[values.length - 1] : 0;

  const gradientId = `latency-gradient-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-5">
        <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
      </div>

      <div className="h-[300px]">
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
              domain={["auto", "auto"]}
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
            />

            <Area
              type="monotone"
              dataKey="latency"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-5 text-xs text-zinc-500">
        <span className="text-zinc-300">
          Avg <span className="font-mono">{avg.toFixed(1)}</span> ms
        </span>
        <span>
          Min <span className="font-mono">{min.toFixed(1)}</span> ms
        </span>
        <span>
          Max <span className="font-mono">{max.toFixed(1)}</span> ms
        </span>
        <span>
          Last <span className="font-mono">{last.toFixed(1)}</span> ms
        </span>
      </div>
    </div>
  );
}