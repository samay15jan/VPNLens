import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

// Added: highlightVpn prop so each chart can be labelled distinctly
// Fixed: was missing the Headscale <Line> entirely
export default function LatencyChart({ data, highlightVpn }) {
  const title = highlightVpn === "headscale"
    ? "Headscale Latency (ms)"
    : "WireGuard Latency (ms)";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">{title}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-3 w-3 rounded-full bg-blue-500"></span>WireGuard
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-3 w-3 rounded-full bg-cyan-400"></span>Headscale
          </div>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #334155",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="wireguard"
              stroke="#3b82f6"
              strokeWidth={highlightVpn === "wireguard" ? 3 : 1.5}
              strokeOpacity={highlightVpn === "headscale" ? 0.35 : 1}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="headscale"
              stroke="#22d3ee"
              strokeWidth={highlightVpn === "headscale" ? 3 : 1.5}
              strokeOpacity={highlightVpn === "wireguard" ? 0.35 : 1}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}