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
  provisioning: "#F59E0B",
  wireguard:    "#3B82F6",
  headscale:    "#64748B",
  done:         "#22C55E",
};

// Animated packet dot that travels between the two server boxes
function PacketAnimation({ active, color }) {
  return (
    <div className="relative h-1 w-full overflow-hidden">
      {active && (
        <div
          className="absolute top-0 h-1 w-1 rounded-full animate-[travel_1.4s_linear_infinite]"
          style={{ backgroundColor: color }}
        />
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
  return <span className="font-mono text-zinc-300">{m}:{s}</span>;
}

export default function LiveBenchmarkView({ session, onViewReport, onBackToDashboard }) {
  // session shape:
  // { id, email, phase: "provisioning"|"wireguard"|"headscale"|"done",
  //   vm1_status, vm2_status, started_at,
  //   wireguard_result: null | { latency_avg, throughput_upload, packet_loss, cpu_avg },
  //   headscale_result: null | { ... } }

  const phaseIdx = PHASE_ORDER.indexOf(session.phase ?? "provisioning");
  const color = PHASE_COLORS[session.phase] ?? "#3B82F6";
  const isRunning = session.phase !== "done";
  const startedAt = useRef(Date.now());

  const steps = [
    { key: "provisioning", label: "Provision VMs" },
    { key: "wireguard",    label: "WireGuard test" },
    { key: "headscale",    label: "Headscale test" },
    { key: "done",         label: "Done" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">

        {/* Header bar */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-6 py-4">
          <div>
            <h1 className="text-base font-medium text-zinc-50">Live benchmark</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Session <span className="font-mono text-zinc-400">{session.id}</span>
              {" · "}Report will be sent to <span className="text-zinc-300">{session.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={15} className="text-zinc-500" />
            <ElapsedTimer startedAt={startedAt.current} />
            {isRunning && <Loader2 size={15} className="animate-spin text-blue-500" />}
          </div>
        </div>

        {/* Progress stepper */}
        <div className="flex items-center gap-2">
          {steps.map((step, i) => {
            const done = i < phaseIdx;
            const active = i === phaseIdx;
            return (
              <div key={step.key} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-all ${
                      done   ? "border-green-600 bg-green-500/10 text-green-500" :
                      active ? "border-blue-500 bg-blue-500/10 text-blue-500" :
                               "border-zinc-800 bg-zinc-900 text-zinc-600"
                    }`}
                  >
                    {done ? <CheckCircle2 size={13} /> : i + 1}
                  </div>
                  <span className={`text-xs ${active ? "text-zinc-200" : done ? "text-green-500" : "text-zinc-600"}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 mb-4 transition-all ${done ? "bg-green-600/50" : "bg-zinc-800"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Packet animation panel */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8">
          <p className="text-center text-sm text-zinc-500 mb-6">
            {isRunning ? PHASE_LABELS[session.phase] ?? "Initializing…" : "Benchmark complete"}
          </p>

          <div className="flex items-center gap-6">
            {/* VM1 */}
            <div className="flex flex-col items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/40 p-5 w-40">
              <Server size={24} className="mb-2 text-zinc-500" strokeWidth={1.5} />
              <span className="text-sm text-zinc-200">VM1</span>
              <span className="text-xs text-zinc-600 mt-0.5">10.0.0.1</span>
              <StatusDot status={session.vm1_status} />
            </div>

            {/* Animated connection */}
            <div className="flex flex-1 flex-col gap-3">
              <PacketAnimation active={isRunning && phaseIdx >= 1} color={color} />
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
                <ArrowRight size={11} />
                <span style={{ color }}>{isRunning ? PHASE_LABELS[session.phase] : "Done"}</span>
                <ArrowRight size={11} />
              </div>
              {/* Return packets */}
              <div className="scale-x-[-1]">
                <PacketAnimation active={isRunning && phaseIdx >= 1} color={color} />
              </div>
            </div>

            {/* VM2 */}
            <div className="flex flex-col items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/40 p-5 w-40">
              <Server size={24} className="mb-2 text-zinc-500" strokeWidth={1.5} />
              <span className="text-sm text-zinc-200">VM2</span>
              <span className="text-xs text-zinc-600 mt-0.5">10.0.0.2</span>
              <StatusDot status={session.vm2_status} />
            </div>
          </div>
        </div>

        {/* Live results — appear as each VPN finishes */}
        <div className="grid gap-4 md:grid-cols-2">
          <ResultCard
            vpn="WireGuard"
            color="#3B82F6"
            result={session.wireguard_result}
            pending={phaseIdx < 1}
          />
          <ResultCard
            vpn="Headscale"
            color="#64748B"
            result={session.headscale_result}
            pending={phaseIdx < 2}
          />
        </div>

        {/* Footer actions */}
        <div className="flex gap-4">
          <button
            onClick={onBackToDashboard}
            className="rounded-md border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 transition"
          >
            ← Back to dashboard
          </button>
          {session.phase === "done" && (
            <button
              onClick={onViewReport}
              className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              View full report →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const map = {
    stopped:     { color: "bg-zinc-600", label: "Stopped" },
    provisioning:{ color: "bg-amber-500 animate-pulse", label: "Provisioning" },
    active:      { color: "bg-green-500 animate-pulse", label: "Active" },
    testing:     { color: "bg-blue-500 animate-pulse", label: "Testing" },
    done:        { color: "bg-green-500", label: "Done" },
  };
  const s = map[status] ?? map.stopped;
  return (
    <span className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
      {s.label}
    </span>
  );
}

function ResultCard({ vpn, color, result, pending }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-medium text-zinc-200">{vpn}</h3>
        {result && <CheckCircle2 size={13} className="text-green-500 ml-auto" />}
      </div>

      {pending && !result && (
        <p className="text-sm text-zinc-600">Waiting to start…</p>
      )}
      {!pending && !result && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 size={13} className="animate-spin" style={{ color }} /> Running…
        </div>
      )}
      {result && (
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Avg latency",  `${result.latency_avg ?? "—"} ms`],
            ["Throughput",   `${result.throughput_upload ?? "—"} Mbps`],
            ["Packet loss",  `${result.packet_loss ?? "—"}%`],
            ["CPU avg",      `${result.cpu_avg ?? "—"}%`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-zinc-600">{label}</p>
              <p className="text-sm font-medium text-zinc-100">{val}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
