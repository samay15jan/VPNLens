import { Server, Lock, ArrowUp, ArrowDown, Cpu, MemoryStick, Timer } from "lucide-react";

export default function NetworkTopology({
  mode,
  protocol,
  port,
  rtt,
  packetLoss,
  throughputUp,
  throughputDown,
  cpuAvg,
  memAvg,
  connectionTime,
  source = { name: "VM1", ip: "10.0.0.1" },
  target = { name: "VM2", ip: "10.0.0.2" },
}) {
  const isHeadscale = mode === "Headscale";
  const accent = isHeadscale ? "#64748B" : "#3B82F6";

  const fmt = (v, digits = 1) => (typeof v === "number" ? v.toFixed(digits) : "—");

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-zinc-300">Network topology</h2>
        <div className="flex items-center gap-3 text-xs">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <Lock size={11} />
            {mode}
          </span>
          <span className="uppercase tracking-wider text-zinc-600">
            {protocol} · Port {port}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Source VM */}
        <VmBox name={source.name} ip={source.ip} cpuAvg={cpuAvg} memAvg={memAvg} accent={accent} />

        {/* Connection */}
        <div className="relative flex flex-1 flex-col items-center gap-3">
          {/* Upload lane */}
          <LaneRow
            icon={<ArrowUp size={11} />}
            label={`${fmt(throughputUp)} Mbps`}
            accent={accent}
            reverse={false}
          />

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-mono text-xs text-zinc-600">
              RTT {typeof rtt === "number" ? `${rtt.toFixed(1)}ms` : "—"} · Loss{" "}
              {typeof packetLoss === "number" ? `${packetLoss.toFixed(2)}%` : "—"}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-zinc-600">
              <Timer size={10} /> Connect {fmt(connectionTime)}s
            </p>
          </div>

          {/* Download lane */}
          <LaneRow
            icon={<ArrowDown size={11} />}
            label={`${fmt(throughputDown)} Mbps`}
            accent={accent}
            reverse
          />
        </div>

        {/* Target VM */}
        <VmBox name={target.name} ip={target.ip} cpuAvg={cpuAvg} memAvg={memAvg} accent={accent} mirrored />
      </div>

      <style>{`
        @keyframes travel {
          0%   { left: 0%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes travel-rev {
          0%   { left: 100%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 0%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function LaneRow({ icon, label, accent, reverse }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="hidden text-[11px] text-zinc-600 sm:inline" style={{ color: accent }}>
        {icon}
      </span>
      <div className="relative h-px w-full flex-1 bg-zinc-800">
        <span
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{
            backgroundColor: accent,
            boxShadow: `0 0 6px ${accent}`,
            animation: `${reverse ? "travel-rev" : "travel"} 2.2s linear infinite`,
          }}
        />
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-[11px] text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function VmBox({ name, ip, cpuAvg, memAvg, accent, mirrored }) {
  const cpuPct = typeof cpuAvg === "number" ? Math.min(100, cpuAvg) : 0;
  const memPct = typeof memAvg === "number" ? Math.min(100, (memAvg / 512) * 100) : 0;

  return (
    <div className="flex w-32 shrink-0 flex-col items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 py-5 sm:w-40">
      <Server size={20} className="text-zinc-500" strokeWidth={1.5} />
      <span className="text-sm text-zinc-200">{name}</span>
      <span className="font-mono text-xs text-zinc-600">{ip}</span>

      <span className="mt-1 flex items-center gap-1 text-xs text-green-500">
        <span className="h-1 w-1 rounded-full bg-green-500" />
        Online
      </span>

      {/* Mini resource gauges */}
      <div className="mt-2 w-24 space-y-1.5">
        <Gauge icon={<Cpu size={10} />} pct={cpuPct} label={typeof cpuAvg === "number" ? `${cpuAvg.toFixed(0)}%` : "—"} color={accent} />
        <Gauge icon={<MemoryStick size={10} />} pct={memPct} label={typeof memAvg === "number" ? `${memAvg.toFixed(0)}MB` : "—"} color={accent} />
      </div>
    </div>
  );
}

function Gauge({ icon, pct, label, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-zinc-600">{icon}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-zinc-600">{label}</span>
    </div>
  );
}