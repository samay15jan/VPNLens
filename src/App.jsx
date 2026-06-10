import { useState, useEffect, useCallback } from "react";
import "./App.css";

import Header from "./components/Header";
import LatencyChart from "./components/LatencyChart";
import ThroughputChart from "./components/ThroughputChart";
import StatCard from "./components/StatCard";
import NetworkTopology from "./components/NetworkTopology";
import BenchmarkHistory from "./components/BenchmarkHistory";
import Footer from "./components/Footer";

import { Activity, Cpu, Clock3, CircleDot } from "lucide-react";

const API = "http://localhost:3000/api";

// summary.data is an array — index by vpn name for easy lookup
function indexSummary(data) {
  if (!Array.isArray(data)) return {};
  return Object.fromEntries(data.map((row) => [row.vpn, row]));
}

// Parse the ISO timestamp the DB returns ("2026-06-10T16:08:56Z")
function parseTs(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

// Transform flat results rows into {time, wireguard, headscale} chart points
function toLatencyPoints(results) {
  // Sort ascending so chart reads left→right in time order
  const sorted = [...results].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  const byTime = {};
  sorted.forEach((r) => {
    if (!r.latency_avg) return;
    const d = parseTs(r.recorded_at);
    const t = d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
    if (!byTime[t]) byTime[t] = { time: t };
    byTime[t][r.vpn] = r.latency_avg;
  });
  return Object.values(byTime).slice(-10);
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

function App() {
  const [mode, setMode] = useState("wireguard");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

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
    fetchData();
    // Poll every 15 seconds for live feel
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Derived data ──────────────────────────────────────────────
  const currentVpnKey = mode === "wireguard" ? "wireguard" : "headscale";
  const otherVpnKey = mode === "wireguard" ? "headscale" : "wireguard";

  const currentStats = summary?.[currentVpnKey] ?? null;
  const otherStats = summary?.[otherVpnKey] ?? null;

  const latencyData = results.length ? toLatencyPoints(results) : [
    { time: "—", wireguard: 0, headscale: 0 },
  ];

  const wgThroughput = toThroughputPoints(results, "wireguard", "upload");
  const hsThroughput = toThroughputPoints(results, "headscale", "upload");

  const benchmarkRows = toBenchmarkRows(results);

  // KPI values — actual API keys are latency_avg_avg, packet_loss_avg, cpu_avg_avg
  const avgLatency = currentStats?.latency_avg_avg ?? "—";
  const packetLoss = currentStats?.packet_loss_avg ?? "—";
  const cpuUsage = currentStats?.cpu_avg_avg ?? "—";

  const latencyDiff =
    currentStats && otherStats
      ? (currentStats.latency_avg_avg - otherStats.latency_avg_avg).toFixed(1)
      : null;
  const packetDiff =
    currentStats && otherStats
      ? (currentStats.packet_loss_avg - otherStats.packet_loss_avg).toFixed(2)
      : null;
  const cpuDiff =
    currentStats && otherStats
      ? (currentStats.cpu_avg_avg - otherStats.cpu_avg_avg).toFixed(1)
      : null;

  const otherLabel = mode === "wireguard" ? "vs Headscale:" : "vs WireGuard:";

  return (
    <div className="min-h-screen bg-[#050b16] text-white">
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-6">
        <Header
          mode={mode}
          setMode={setMode}
          onRefresh={fetchData}
          sampleCount={results.length}
          lastRefresh={lastRefresh}
          loading={loading}
        />

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
          <h2 className="mb-4 text-xl font-semibold">Latency Analysis</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <LatencyChart data={latencyData} highlightVpn="wireguard" />
            <LatencyChart data={latencyData} highlightVpn="headscale" />
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