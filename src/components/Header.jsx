import { RefreshCw, Shield } from "lucide-react";

// Fixed: destructure props properly (was Header(mode, setMode) which passes the whole props object as `mode`)
export default function Header({ mode, setMode, onRefresh, sampleCount, lastRefresh, loading }) {
  const refreshLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-blue-500/30 bg-blue-500/10">
            <Shield size={20} className="text-blue-500" />
          </div>
          <h1 className="text-xl font-medium text-white tracking-wide">VPNLens</h1>
        </div>

        <span className="text-green-400">● Benchmark Running</span>

        <span className="text-slate-400">
          Samples: {sampleCount ?? "—"}
        </span>

        {refreshLabel && (
          <span className="text-slate-400 text-sm">
            Updated: {refreshLabel}
          </span>
        )}
      </div>

      <div className="flex overflow-hidden">
        <div className="rounded-lg border border-slate-700">
          <button
            onClick={() => setMode("wireguard")}
            className={`px-4 py-2 text-sm ${mode === "wireguard" ? "bg-blue-600" : "bg-slate-900"}`}
          >
            WireGuard
          </button>
          <button
            onClick={() => setMode("headscale")}
            className={`px-4 py-2 text-sm ${mode === "headscale" ? "bg-cyan-600" : "bg-slate-900"}`}
          >
            Headscale
          </button>
        </div>

        <div className="flex items-center gap-4 mx-5">
          <button
            onClick={onRefresh}
            title="Refresh data"
            className={`text-slate-400 hover:text-white transition ${loading ? "animate-spin" : ""}`}
          >
            <RefreshCw size={18} />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-green-400 text-sm">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}