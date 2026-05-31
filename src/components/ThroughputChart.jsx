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
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="font-mono text-lg"
          style={{ color }}
        >
          ● {title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          Live
          <span className="h-2 w-2 rounded-full bg-green-500" />
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              stroke="#1e293b"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="time"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #1e293b",
                borderRadius: "8px",
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

      <div className="mt-4 flex flex-wrap gap-6 text-sm font-mono">
        <span style={{ color }}>
          Avg: {avg.toFixed(1)} Mbps
        </span>

        <span className="text-slate-400">
          Min: {min.toFixed(1)} Mbps
        </span>

        <span className="text-slate-400">
          Max: {max.toFixed(1)} Mbps
        </span>

        <span className="text-slate-400">
          Last: {last.toFixed(1)} Mbps
        </span>
      </div>
    </div>
  );
}