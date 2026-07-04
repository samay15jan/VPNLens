import { RefreshCw, Shield } from "lucide-react";

// Fixed: destructure props properly (was Header(mode, setMode) which passes the whole props object as `mode`)
export default function Header({ mode, setMode, onRefresh, sampleCount, lastRefresh, loading }) {
  const refreshLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <Shield size={18} className="text-zinc-400" strokeWidth={1.75} />
          <h1 className="text-base font-medium tracking-tight text-zinc-50">VPNLens</h1>
        </div>

        <span className="hidden items-center gap-1.5 text-sm text-zinc-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Benchmark System
        </span>

        <span className="hidden text-sm text-zinc-500 sm:inline">
          Samples <span className="text-zinc-300">{sampleCount ?? "—"}</span>
        </span>

        {refreshLabel && (
          <span className="hidden text-sm text-zinc-500 md:inline">
            Updated {refreshLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex overflow-hidden rounded-md border border-zinc-800">
          <button
            onClick={() => setMode("wireguard")}
            className={`px-3.5 py-1.5 text-sm transition ${
              mode === "wireguard"
                ? "bg-blue-600 text-white"
                : "bg-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            WireGuard
          </button>
          <button
            onClick={() => setMode("headscale")}
            className={`px-3.5 py-1.5 text-sm transition ${
              mode === "headscale"
                ? "bg-zinc-700 text-white"
                : "bg-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Headscale
          </button>
        </div>

        <button
          onClick={onRefresh}
          title="Refresh data"
          className={`rounded-md border border-zinc-800 p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 ${
            loading ? "animate-spin" : ""
          }`}
        >
          <RefreshCw size={15} />
        </button>

        <span className="flex items-center gap-1.5 text-sm text-green-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
    </div>
  );
}
