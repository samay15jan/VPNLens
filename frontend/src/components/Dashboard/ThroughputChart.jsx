import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function ThroughputChart({
  title,
  data,
  color,
}) {
  const values = data.map((d) => d.value);

  const avg =
    values.reduce((a, b) => a + b, 0) / values.length;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const last = values[values.length - 1];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">
          {title}
        </h3>

        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Live
        </span>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              stroke="#27272A"
              strokeDasharray="3 3"
              vertical={false}
            />

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

            <Bar
              dataKey="value"
              fill={color}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-5 text-xs text-zinc-500">
        <span className="text-zinc-300">
          Avg <span className="font-mono">{avg.toFixed(1)}</span> Mbps
        </span>
        <span>
          Min <span className="font-mono">{min.toFixed(1)}</span> Mbps
        </span>
        <span>
          Max <span className="font-mono">{max.toFixed(1)}</span> Mbps
        </span>
        <span>
          Last <span className="font-mono">{last.toFixed(1)}</span> Mbps
        </span>
      </div>
    </div>
  );
}
