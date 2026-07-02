import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Clock, Loader2, Server, ArrowRight } from "lucide-react";

const PHASE_ORDER = ["provisioning", "wireguard", "headscale", "done"];

const PHASE_LABELS = {
  provisioning: "Provisioning VMs",
  wireguard:    "Testing WireGuard",
  headscale:    "Testing Headscale",
  done:         "Complete",
};

const PHASE_COLORS = {
  provisioning: "#f59e0b",
  wireguard:    "#3b82f6",
  headscale:    "#22d3ee",
  done:         "#22c55e",
};

// Animated packet dot that travels between the two server boxes
function PacketAnimation({ active, color }) {
  return (
    <div className="relative h-2 w-full overflow-hidden">
      {active && (
        <>
          <div
            className="absolute top-0 h-2 w-2 rounded-full animate-[travel_1.4s_linear_infinite]"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
          />
          <div
            className="absolute top-0 h-2 w-2 rounded-full animate-[travel_1.4s_linear_infinite_0.7s]"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}`, opacity: 0.5 }}
          />
        </>
      )}
      <style>{`
        @keyframes travel {
          0%   { left: 0%; opacity: 1; }
          45%  { left: 100%; opacity: 1; }
          46%  { left: 100%; opacity: 0; }
          47%  { left: 0%; opacity: 0; }
          48%  { left: 0%; opacity: 1; }
          100% { left: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ElapsedTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return <span className="font-mono text-slate-300">{m}:{s}</span>;
}

export default function LiveBenchmarkView({ session, onViewReport, onBackToDashboard }) {
  // session shape:
  // { id, email, phase: "provisioning"|"wireguard"|"headscale"|"done",
  //   vm1_status, vm2_status, started_at,
  //   wireguard_result: null | { latency_avg, throughput_upload, packet_loss, cpu_avg },
  //   headscale_result: null | { ... } }

  const phaseIdx = PHASE_ORDER.indexOf(session.phase ?? "provisioning");
  const color = PHASE_COLORS[session.phase] ?? "#3b82f6";
  const isRunning = session.phase !== "done";
  const startedAt = useRef(Date.now());

  const steps = [
    { key: "provisioning", label: "Provision VMs" },
    { key: "wireguard",    label: "WireGuard test" },
    { key: "headscale",    label: "Headscale test" },
    { key: "done",         label: "Done" },
  ];

  return (
    <div className="min-h-screen bg-[#050b16] text-white">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">

        {/* Header bar */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Live Benchmark</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Session <span className="font-mono text-slate-300">{session.id}</span>
              {" · "}Report will be sent to <span className="text-blue-400">{session.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-slate-400" />
            <ElapsedTimer startedAt={startedAt.current} />
            {isRunning && <Loader2 size={16} className="animate-spin text-blue-400" />}
          </div>
        </div>

        {/* Progress stepper */}
        <div className="flex items-center gap-2">
          {steps.map((step, i) => {
            const done = i < phaseIdx;
            const active = i === phaseIdx;
            return (
              <div key={step.key} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-all ${
                      done   ? "border-green-500 bg-green-500/20 text-green-400" :
                      active ? "border-blue-500 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/30" :
                               "border-slate-700 bg-slate-900 text-slate-500"
                    }`}
                  >
                    {done ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs ${active ? "text-white" : done ? "text-green-400" : "text-slate-500"}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 mb-4 transition-all ${done ? "bg-green-500/50" : "bg-slate-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Packet animation panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-8">
          <p className="text-center text-sm text-slate-400 mb-6">
            {isRunning ? PHASE_LABELS[session.phase] ?? "Initializing…" : "Benchmark complete"}
          </p>

          <div className="flex items-center gap-6">
            {/* VM1 */}
            <div className={`flex flex-col items-center justify-center rounded-xl border p-5 w-40 transition-all ${
              session.vm1_status === "active" || session.vm1_status === "testing"
                ? "border-blue-500/60 bg-blue-500/10"
                : "border-slate-700 bg-slate-900"
            }`}>
              <Server size={28} className="mb-2 text-slate-300" />
              <span className="text-sm font-medium text-white">VM1</span>
              <span className="text-xs text-slate-400 mt-0.5">10.0.0.1</span>
              <StatusDot status={session.vm1_status} />
            </div>

            {/* Animated connection */}
            <div className="flex flex-1 flex-col gap-3">
              <PacketAnimation active={isRunning && phaseIdx >= 1} color={color} />
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ArrowRight size={12} />
                <span style={{ color }}>{isRunning ? PHASE_LABELS[session.phase] : "Done"}</span>
                <ArrowRight size={12} />
              </div>
              {/* Return packets */}
              <div className="scale-x-[-1]">
                <PacketAnimation active={isRunning && phaseIdx >= 1} color={color} />
              </div>
            </div>

            {/* VM2 */}
            <div className={`flex flex-col items-center justify-center rounded-xl border p-5 w-40 transition-all ${
              session.vm2_status === "active" || session.vm2_status === "testing"
                ? "border-cyan-500/60 bg-cyan-500/10"
                : "border-slate-700 bg-slate-900"
            }`}>
              <Server size={28} className="mb-2 text-slate-300" />
              <span className="text-sm font-medium text-white">VM2</span>
              <span className="text-xs text-slate-400 mt-0.5">10.0.0.2</span>
              <StatusDot status={session.vm2_status} />
            </div>
          </div>
        </div>

        {/* Live results — appear as each VPN finishes */}
        <div className="grid gap-4 md:grid-cols-2">
          <ResultCard
            vpn="WireGuard"
            color="#3b82f6"
            result={session.wireguard_result}
            pending={phaseIdx < 1}
          />
          <ResultCard
            vpn="Headscale"
            color="#22d3ee"
            result={session.headscale_result}
            pending={phaseIdx < 2}
          />
        </div>

        {/* Footer actions */}
        <div className="flex gap-4">
          <button
            onClick={onBackToDashboard}
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-400 hover:bg-slate-800 transition"
          >
            ← Back to Dashboard
          </button>
          {session.phase === "done" && (
            <button
              onClick={onViewReport}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              View Full Report →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const map = {
    stopped:     { color: "bg-slate-500", label: "Stopped" },
    provisioning:{ color: "bg-yellow-400 animate-pulse", label: "Provisioning" },
    active:      { color: "bg-green-400 animate-pulse", label: "Active" },
    testing:     { color: "bg-blue-400 animate-pulse", label: "Testing" },
    done:        { color: "bg-green-500", label: "Done" },
  };
  const s = map[status] ?? map.stopped;
  return (
    <span className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
      {s.label}
    </span>
  );
}

function ResultCard({ vpn, color, result, pending }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="font-medium text-white">{vpn}</h3>
        {result && <CheckCircle2 size={14} className="text-green-400 ml-auto" />}
      </div>

      {pending && !result && (
        <p className="text-sm text-slate-500">Waiting to start…</p>
      )}
      {!pending && !result && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" style={{ color }} /> Running…
        </div>
      )}
      {result && (
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Avg Latency",  `${result.latency_avg ?? "—"} ms`],
            ["Throughput",   `${result.throughput_upload ?? "—"} Mbps`],
            ["Packet Loss",  `${result.packet_loss ?? "—"}%`],
            ["CPU Avg",      `${result.cpu_avg ?? "—"}%`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-medium text-white">{val}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}