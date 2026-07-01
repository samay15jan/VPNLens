import { useState, useEffect, useCallback } from "react";
import "./App.css";

import Header from "./components/Header";
import LatencyChart from "./components/LatencyChart";
import ThroughputChart from "./components/ThroughputChart";
import StatCard from "./components/StatCard";
import NetworkTopology from "./components/NetworkTopology";
import BenchmarkHistory from "./components/BenchmarkHistory";
import Footer from "./components/Footer";
import StartBenchmarkModal from "./components/StartBenchmarkModal";
import LiveBenchmarkView from "./components/LiveBenchmarkView";
import ReportView from "./components/ReportView";

import { Activity, Cpu, Clock3, CircleDot, Play } from "lucide-react";

const API = "https://backend.vpn.samay15jan.com/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function indexSummary(data) {
  if (!Array.isArray(data)) return {};
  return Object.fromEntries(data.map((row) => [row.vpn, row]));
}

function parseTs(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

function toLatencyPoints(results, vpn) {
  return results
    .filter((r) => r.vpn === vpn && r.latency_avg != null)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-10)
    .map((r) => {
      const d = parseTs(r.recorded_at);

      return {
        time: d
          ? d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
          : "—",
        latency: r.latency_avg,
      };
    });
}

function toThroughputPoints(results, vpn, direction = "upload") {
  return results
    .filter((r) => r.vpn === vpn && r[`throughput_${direction}`] != null)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-10)
    .map((r) => {
      const d = parseTs(r.recorded_at);
      return {
        time: d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
        value: r[`throughput_${direction}`],
      };
    });
}

function toBenchmarkRows(results) {
  return [...results]
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
    .map((r) => {
      const d = parseTs(r.recorded_at);
      return {
        id: r.id,
        timestamp: d ? d.toLocaleString() : "—",
        mode: r.vpn === "wireguard" ? "WireGuard" : "Headscale",
        duration: "02:00",
        latency: r.latency_avg ?? "—",
        packetLoss: r.packet_loss ?? "—",
        throughput: r.throughput_upload ?? "—",
        cpu: r.cpu_avg ?? "—",
        status: r.runs_failed === 0 ? "Success" : "Partial",
      };
    });
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  // view: "dashboard" | "live" | "report"
  const [view, setView] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [session, setSession] = useState(null);

  const [mode, setMode] = useState("wireguard");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── Dashboard data polling ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [resRes, sumRes] = await Promise.all([
        fetch(`${API}/results`),
        fetch(`${API}/summary`),
      ]);
      const resJson = await resRes.json();
      const sumJson = await sumRes.json();
      if (resJson.success) setResults(resJson.data ?? []);
      if (sumJson.success) setSummary(indexSummary(sumJson.data));
      setLastRefresh(new Date());
    } catch (e) {
      console.error("API fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view !== "dashboard") return;
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData, view]);

  // ── Session polling (live view) ────────────────────────────────────────────
  const fetchSession = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API}/benchmark/session/${sessionId}`);
      const json = await res.json();
      if (json.success) {
        setSession(json.data);
        if (json.data.phase === "done") {
          // Refresh dashboard data so it's fresh when user goes back
          fetchData();
        }
      }
    } catch (e) {
      console.error("Session poll failed:", e);
    }
  }, [fetchData]);

  useEffect(() => {
    if (view !== "live" || !session?.id) return;
    if (session.phase === "done") return; // stop polling when done
    const id = setInterval(() => fetchSession(session.id), 3000);
    return () => clearInterval(id);
  }, [view, session?.id, session?.phase, fetchSession]);

  // ── Start benchmark ────────────────────────────────────────────────────────
  async function handleStart(email) {
    const res = await fetch(`${API}/benchmark/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Failed to start benchmark");
    setSession(json.data);
    setShowModal(false);
    setView("live");
  }

  // ── Derived dashboard data ─────────────────────────────────────────────────
  const currentVpnKey = mode === "wireguard" ? "wireguard" : "headscale";
  const otherVpnKey = mode === "wireguard" ? "headscale" : "wireguard";
  const currentStats = summary?.[currentVpnKey] ?? null;
  const otherStats = summary?.[otherVpnKey] ?? null;

  const wgLatency = results.length
    ? toLatencyPoints(results, "wireguard")
    : [{ time: "—", latency: 0 }];

  const hsLatency = results.length
    ? toLatencyPoints(results, "headscale")
    : [{ time: "—", latency: 0 }];
  const wgThroughput = toThroughputPoints(results, "wireguard", "upload");
  const hsThroughput = toThroughputPoints(results, "headscale", "upload");
  const benchmarkRows = toBenchmarkRows(results);

  const avgLatency = currentStats?.latency_avg_avg ?? "—";
  const packetLoss = currentStats?.packet_loss_avg ?? "—";
  const cpuUsage = currentStats?.cpu_avg_avg ?? "—";
  const otherLabel = mode === "wireguard" ? "vs Headscale:" : "vs WireGuard:";

  const latencyDiff = currentStats && otherStats
    ? (currentStats.latency_avg_avg - otherStats.latency_avg_avg).toFixed(1) : null;
  const packetDiff = currentStats && otherStats
    ? (currentStats.packet_loss_avg - otherStats.packet_loss_avg).toFixed(2) : null;
  const cpuDiff = currentStats && otherStats
    ? (currentStats.cpu_avg_avg - otherStats.cpu_avg_avg).toFixed(1) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === "live" && session) {
    return (
      <LiveBenchmarkView
        session={session}
        onViewReport={() => setView("report")}
        onBackToDashboard={() => setView("dashboard")}
      />
    );
  }

  if (view === "report" && session) {
    return (
      <ReportView
        session={session}
        onBack={() => setView("dashboard")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050b16] text-white">
      {showModal && (
        <StartBenchmarkModal
          onClose={() => setShowModal(false)}
          onStart={handleStart}
        />
      )}

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-6">
        <Header
          mode={mode}
          setMode={setMode}
          onRefresh={fetchData}
          sampleCount={results.length}
          lastRefresh={lastRefresh}
          loading={loading}
        />

        {/* Run Benchmark CTA */}
        <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-white">Ready to run a new benchmark?</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Spins up both VMs, tests WireGuard + Headscale, emails you the report.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition shrink-0"
          >
            <Play size={14} /> Run Benchmark
          </button>
        </div>

        {/* KPI SECTION */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Performance Summary</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Average Latency"
              value={typeof avgLatency === "number" ? avgLatency.toFixed(1) : avgLatency}
              unit="ms"
              accentColor="#3b82f6"
              icon={<Activity size={22} />}
              comparison={latencyDiff != null ? `${latencyDiff > 0 ? "+" : ""}${latencyDiff} ms` : null}
              comparisonLabel={otherLabel}
            />
            <StatCard
              title="Packet Loss"
              value={typeof packetLoss === "number" ? packetLoss.toFixed(2) : packetLoss}
              unit="%"
              accentColor="#14b8a6"
              icon={<CircleDot size={22} />}
              comparison={packetDiff != null ? `${packetDiff > 0 ? "+" : ""}${packetDiff}%` : null}
              comparisonLabel={otherLabel}
            />
            <StatCard
              title="CPU Usage"
              value={typeof cpuUsage === "number" ? cpuUsage.toFixed(1) : cpuUsage}
              unit="%"
              accentColor="#f59e0b"
              icon={<Cpu size={22} />}
              comparison={cpuDiff != null ? `${cpuDiff > 0 ? "+" : ""}${cpuDiff}%` : null}
              comparisonLabel={otherLabel}
            />
            <StatCard
              title="Total Runs"
              value={currentStats?.total_runs ?? (loading ? "…" : "0")}
              accentColor="#a855f7"
              icon={<Clock3 size={22} />}
            />
          </div>
        </section>

        {/* TOPOLOGY */}
        <section>
          <NetworkTopology
            mode={mode === "wireguard" ? "WireGuard" : "Headscale"}
            protocol="UDP"
            port={mode === "wireguard" ? "51820" : "41641"}
            rtt={typeof avgLatency === "number" ? avgLatency : 0}
            packetLoss={typeof packetLoss === "number" ? packetLoss : 0}
            source={{ name: "VM1", ip: "10.0.0.1" }}
            target={{ name: "VM2", ip: "10.0.0.2" }}
          />
        </section>

        {/* LATENCY */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Latency Analysis
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            <LatencyChart
              title="WireGuard Latency (ms)"
              data={wgLatency}
              color="#3b82f6"
            />

            <LatencyChart
              title="Headscale Latency (ms)"
              data={hsLatency}
              color="#22d3ee"
            />
          </div>
        </section>

        {/* THROUGHPUT */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Throughput Analysis</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ThroughputChart
              title="WireGuard Throughput"
              data={wgThroughput.length ? wgThroughput : [{ time: "—", value: 0 }]}
              color="#3b82f6"
            />
            <ThroughputChart
              title="Headscale Throughput"
              data={hsThroughput.length ? hsThroughput : [{ time: "—", value: 0 }]}
              color="#14b8a6"
            />
          </div>
        </section>

        {/* HISTORY */}
        <section>
          <BenchmarkHistory data={benchmarkRows} />
        </section>

        <Footer />
      </main>
    </div>
  );
}

export default App;