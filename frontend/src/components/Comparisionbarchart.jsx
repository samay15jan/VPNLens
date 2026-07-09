import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// data: [{ metric: "Min", WireGuard: 1.2, Headscale: 1.8 }, ...]
export default function ComparisonBarChart({ title, data = [], unit }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="mb-4 text-sm font-medium text-zinc-300">{title}</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={6}>
            <CartesianGrid stroke="#27272A" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="metric"
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
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
              formatter={(v) => `${v} ${unit}`}
            />

            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => <span style={{ color: "#A1A1AA" }}>{value}</span>}
            />

            <Bar dataKey="WireGuard" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Headscale" fill="#64748B" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}