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
  const wg = session.wireguard_result ?? {};
  const hs = session.headscale_result ?? {};

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
  const overallColor  = overallWinner === "WireGuard" ? "#3b82f6" : "#22d3ee";

  return (
    <div className="min-h-screen bg-[#050b16] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">

        {/* Report header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10">
              <Shield size={24} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">VPN Benchmark Report</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Session {session.id} · {new Date(session.started_at ?? Date.now()).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 transition"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
            >
              <Download size={14} /> Save / Print
            </button>
          </div>
        </div>

        {/* Verdict banner */}
        <div
          className="rounded-xl border p-6 text-center"
          style={{ borderColor: `${overallColor}40`, backgroundColor: `${overallColor}08` }}
        >
          <p className="text-sm text-slate-400 mb-1">Overall Winner</p>
          <p className="text-3xl font-bold" style={{ color: overallColor }}>{overallWinner}</p>
          <p className="text-sm text-slate-400 mt-1">
            Won {overallWinner === "WireGuard" ? wgWins : hsWins} of {metrics.length} metrics
          </p>
        </div>

        {/* Radar chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Performance Profile</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Radar name="WireGuard" dataKey="WireGuard" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Headscale"  dataKey="Headscale"  stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                  formatter={(v) => `${v.toFixed(0)} / 100`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />WireGuard</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />Headscale</span>
          </div>
        </div>

        {/* Metric-by-metric table */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-lg font-medium text-white">Detailed Comparison</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-sm text-slate-400">
                <th className="px-6 py-3 text-left">Metric</th>
                <th className="px-4 py-3 text-right text-blue-400">WireGuard</th>
                <th className="px-4 py-3 text-right text-cyan-400">Headscale</th>
                <th className="px-4 py-3 text-center">Winner</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const w = winner(m.wg, m.hs, m.lowerIsBetter);
                return (
                  <tr key={m.label} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                    <td className="px-6 py-3 text-sm text-slate-300">{m.label}</td>
                    <td className={`px-4 py-3 text-right text-sm font-mono ${w === "wireguard" ? "text-blue-400 font-semibold" : "text-slate-300"}`}>
                      {m.wg != null ? `${m.wg} ${m.unit}` : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-mono ${w === "headscale" ? "text-cyan-400 font-semibold" : "text-slate-300"}`}>
                      {m.hs != null ? `${m.hs} ${m.unit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {w ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${w === "wireguard" ? "#3b82f6" : "#22d3ee"}18`, color: w === "wireguard" ? "#3b82f6" : "#22d3ee" }}
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
        <p className="text-center text-xs text-slate-600 pb-4">
          VPNLens · B.Tech IT 2026 · Samay Kumar
        </p>
      </div>
    </div>
  );
}