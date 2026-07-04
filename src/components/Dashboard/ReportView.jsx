import { Shield, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Tooltip,
} from "recharts";

// Normalize a metric so lower=better metrics are flipped (latency, packet loss, cpu)
function normalize(val, min, max, lowerIsBetter = false) {
  if (val == null || min === max) return 50;
  const raw = ((val - min) / (max - min)) * 100;
  return lowerIsBetter ? 100 - raw : raw;
}

export default function ReportView({ session, onBack }) {
  // Backend shape (GET /results/:token) is:
  //   { token, email, status, error, created_at, completed_at, results: { wireguard, headscale } }
  // NOT session.wireguard_result / session.headscale_result.
  const wg = session.results?.wireguard ?? {};
  const hs = session.results?.headscale ?? {};

  // Radar axes — normalize each so 100 = best
  const radarData = [
    {
      metric: "Latency",
      WireGuard: normalize(wg.latency_avg, 10, 50, true),
      Headscale:  normalize(hs.latency_avg, 10, 50, true),
    },
    {
      metric: "Throughput",
      WireGuard: normalize(wg.throughput_upload, 400, 900),
      Headscale:  normalize(hs.throughput_upload, 400, 900),
    },
    {
      metric: "Packet Loss",
      WireGuard: normalize(wg.packet_loss, 0, 1, true),
      Headscale:  normalize(hs.packet_loss, 0, 1, true),
    },
    {
      metric: "CPU Eff.",
      WireGuard: normalize(wg.cpu_avg, 5, 30, true),
      Headscale:  normalize(hs.cpu_avg, 5, 30, true),
    },
    {
      metric: "Connect Time",
      WireGuard: normalize(wg.connection_time_s, 0.5, 4, true),
      Headscale:  normalize(hs.connection_time_s, 0.5, 4, true),
    },
  ];

  // Simple winner per metric
  const winner = (wgVal, hsVal, lowerIsBetter = false) => {
    if (wgVal == null || hsVal == null) return null;
    const wgWins = lowerIsBetter ? wgVal < hsVal : wgVal > hsVal;
    return wgWins ? "wireguard" : "headscale";
  };

  const metrics = [
    { label: "Avg Latency",      wg: wg.latency_avg,       hs: hs.latency_avg,       unit: "ms",   lowerIsBetter: true  },
    { label: "Throughput",       wg: wg.throughput_upload,  hs: hs.throughput_upload,  unit: "Mbps", lowerIsBetter: false },
    { label: "Packet Loss",      wg: wg.packet_loss,        hs: hs.packet_loss,        unit: "%",    lowerIsBetter: true  },
    { label: "CPU Avg",          wg: wg.cpu_avg,            hs: hs.cpu_avg,            unit: "%",    lowerIsBetter: true  },
    { label: "Connection Time",  wg: wg.connection_time_s,  hs: hs.connection_time_s,  unit: "s",    lowerIsBetter: true  },
    { label: "Recovery Time",    wg: wg.recovery_time_s,    hs: hs.recovery_time_s,    unit: "s",    lowerIsBetter: true  },
  ];

  const wgWins = metrics.filter(m => winner(m.wg, m.hs, m.lowerIsBetter) === "wireguard").length;
  const hsWins = metrics.filter(m => winner(m.wg, m.hs, m.lowerIsBetter) === "headscale").length;
  const overallWinner = wgWins >= hsWins ? "WireGuard" : "Headscale";
  const winCount = overallWinner === "WireGuard" ? wgWins : hsWins;
  const overallColor  = overallWinner === "WireGuard" ? "#3B82F6" : "#64748B";
  const overallScore = Math.round((winCount / metrics.length) * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">

        {/* Report header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <Shield size={20} className="text-zinc-400" strokeWidth={1.75} />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-50">VPN Benchmark Report</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                {session.token ? `${session.token.slice(0, 12)}…` : "Report"} ·{" "}
                {new Date(session.created_at ?? Date.now()).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 transition"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 transition"
            >
              <Download size={14} /> Save / Print
            </button>
          </div>
        </div>

        {/* Verdict banner */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Overall winner</p>
          <p className="text-4xl font-semibold tracking-tight" style={{ color: overallColor }}>
            {overallWinner}
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Won {winCount} of {metrics.length} metrics
          </p>
          <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2">
            <span className="text-3xl font-semibold text-zinc-50">{overallScore}</span>
            <span className="text-sm text-zinc-500">/ 100 overall score</span>
          </div>
        </div>

        {/* Radar chart */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Performance profile</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#27272A" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#A1A1AA", fontSize: 12 }} />
                <Radar name="WireGuard" dataKey="WireGuard" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.12} strokeWidth={2} />
                <Radar name="Headscale"  dataKey="Headscale"  stroke="#64748B"  fill="#64748B"  fillOpacity={0.12} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111113", border: "1px solid #27272A", borderRadius: "8px", color: "#FAFAFA" }}
                  formatter={(v) => `${v.toFixed(0)} / 100`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-sm text-zinc-500">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500" />WireGuard</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" />Headscale</span>
          </div>
        </div>

        {/* Metric-by-metric table */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-sm font-medium text-zinc-300">Detailed comparison</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-600">
                <th className="px-6 py-3 text-left font-medium">Metric</th>
                <th className="px-4 py-3 text-right font-medium text-blue-400">WireGuard</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Headscale</th>
                <th className="px-4 py-3 text-center font-medium">Winner</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const w = winner(m.wg, m.hs, m.lowerIsBetter);
                return (
                  <tr key={m.label} className="border-b border-zinc-800/60 hover:bg-zinc-900/60">
                    <td className="px-6 py-3 text-sm text-zinc-400">{m.label}</td>
                    <td className={`px-4 py-3 text-right text-sm font-mono ${w === "wireguard" ? "text-blue-400 font-semibold" : "text-zinc-400"}`}>
                      {m.wg != null ? `${m.wg} ${m.unit}` : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-mono ${w === "headscale" ? "text-zinc-200 font-semibold" : "text-zinc-400"}`}>
                      {m.hs != null ? `${m.hs} ${m.unit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {w ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${w === "wireguard" ? "#3B82F6" : "#64748B"}18`, color: w === "wireguard" ? "#3B82F6" : "#94A3B8" }}
                        >
                          <CheckCircle2 size={11} />
                          {w === "wireguard" ? "WireGuard" : "Headscale"}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-700 pb-4">
          VPNLens · B.Tech IT 2026 · Samay Kumar
        </p>
      </div>
    </div>
  );
}
