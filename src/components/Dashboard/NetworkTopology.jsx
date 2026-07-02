import { Server, Lock } from "lucide-react";

// Fixed: now actually uses all the props passed from App.jsx (was hardcoded before)
export default function NetworkTopology({
  mode, protocol, port, rtt, packetLoss,
  source = { name: "VM1", ip: "10.0.0.1" },
  target = { name: "VM2", ip: "10.0.0.2" },
}) {
  const isHeadscale = mode === "Headscale";
  const lineColor = isHeadscale ? "#22d3ee" : "#3b82f6";
  const borderStyle = isHeadscale ? "border-cyan-500/50" : "border-blue-500/50";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
      <h2 className="mb-8 text-lg font-medium text-white">Network Topology</h2>

      <div className="relative flex items-center justify-between">
        {/* Source VM */}
        <div className="z-10 flex flex-col items-center">
          <div className={`flex h-32 w-40 flex-col items-center justify-center rounded-xl border ${borderStyle} bg-slate-900`}>
            <Server className="mb-3 text-slate-300" size={32} />
            <h3 className="text-lg text-white">{source.name}</h3>
            <p className="text-sm text-slate-400">{source.ip}</p>
            <span className="mt-2 text-xs text-green-400">● Online</span>
          </div>
        </div>

        {/* Connection Line */}
        <div className="absolute left-[22%] right-[22%] top-1/2 -translate-y-1/2">
          <div className="relative h-[2px]" style={{ backgroundColor: `${lineColor}40` }}>
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <div className="rounded-full border border-slate-700 bg-slate-900 p-3">
                <Lock size={20} className="text-slate-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Center Info (below the line) */}
        <div className="absolute left-1/2 top-full mt-4 -translate-x-1/2 text-center whitespace-nowrap">
          <p className="text-sm text-slate-400">Active Tunnel</p>
          <p className="mt-1 font-medium" style={{ color: lineColor }}>
            {mode} {isHeadscale ? "(Mesh)" : "(Centralized)"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Encrypted • {protocol} • {port}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            RTT:
            <span className="ml-1" style={{ color: lineColor }}>
              {typeof rtt === "number" ? `${rtt.toFixed(1)} ms` : "—"}
            </span>
            <span className="mx-2">|</span>
            Loss:
            <span className="ml-1 text-cyan-400">
              {typeof packetLoss === "number" ? `${packetLoss.toFixed(2)}%` : "—"}
            </span>
          </p>
        </div>

        {/* Target VM */}
        <div className="z-10 flex flex-col items-center">
          <div className={`flex h-32 w-40 flex-col items-center justify-center rounded-xl border ${borderStyle} bg-slate-900`}>
            <Server className="mb-3 text-slate-300" size={32} />
            <h3 className="text-lg text-white">{target.name}</h3>
            <p className="text-sm text-slate-400">{target.ip}</p>
            <span className="mt-2 text-xs text-green-400">● Online</span>
          </div>
        </div>
      </div>

      <div className="h-32" />
    </div>
  );
}