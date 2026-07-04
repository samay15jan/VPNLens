import { Server, Lock } from "lucide-react";

// Fixed: now actually uses all the props passed from App.jsx (was hardcoded before)
export default function NetworkTopology({
  mode, protocol, port, rtt, packetLoss,
  source = { name: "VM1", ip: "10.0.0.1" },
  target = { name: "VM2", ip: "10.0.0.2" },
}) {
  const isHeadscale = mode === "Headscale";
  const accent = isHeadscale ? "#64748B" : "#3B82F6";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="mb-10 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Network topology</h2>
        <span className="text-xs uppercase tracking-wider text-zinc-600">
          {protocol} · {port}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Source VM */}
        <VmBox name={source.name} ip={source.ip} />

        {/* Connection */}
        <div className="relative flex flex-1 flex-col items-center">
          <div className="relative h-px w-full bg-zinc-800">
            <span
              className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full animate-[travel_2.2s_linear_infinite]"
              style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
            />
          </div>

          <div className="mt-4 flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: accent }}>
              <Lock size={11} />
              {mode}
            </div>
            <p className="font-mono text-xs text-zinc-600">
              RTT {typeof rtt === "number" ? `${rtt.toFixed(1)}ms` : "—"} · Loss{" "}
              {typeof packetLoss === "number" ? `${packetLoss.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>

        {/* Target VM */}
        <VmBox name={target.name} ip={target.ip} />
      </div>

      <style>{`
        @keyframes travel {
          0%   { left: 0%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function VmBox({ name, ip }) {
  return (
    <div className="flex w-32 flex-col items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/40 py-5">
      <Server size={20} className="text-zinc-500" strokeWidth={1.5} />
      <span className="text-sm text-zinc-200">{name}</span>
      <span className="font-mono text-xs text-zinc-600">{ip}</span>
      <span className="mt-1 flex items-center gap-1 text-xs text-green-500">
        <span className="h-1 w-1 rounded-full bg-green-500" />
        Online
      </span>
    </div>
  );
}
