import { useState } from "react";

import "./App.css";

import Header from "./components/Header";
import LatencyChart from "./components/LatencyChart";
import ThroughputChart from "./components/ThroughputChart";
import StatCard from "./components/StatCard";
import NetworkTopology from "./components/NetworkTopology";
import BenchmarkHistory from "./components/BenchmarkHistory";

import {
  Activity,
  Cpu,
  Clock3,
  CircleDot,
} from "lucide-react";
import Footer from "./components/Footer";
import { Menu, RefreshCw, Shield } from "lucide-react";

const latencyData = [
  { time: "14:45", wireguard: 31, headscale: 18 },
  { time: "14:46", wireguard: 29, headscale: 17 },
  { time: "14:47", wireguard: 33, headscale: 19 },
  { time: "14:48", wireguard: 27, headscale: 16 },
  { time: "14:49", wireguard: 30, headscale: 18 },
  { time: "14:50", wireguard: 28, headscale: 17 },
  { time: "14:51", wireguard: 34, headscale: 20 },
  { time: "14:52", wireguard: 29, headscale: 18 },
  { time: "14:53", wireguard: 32, headscale: 19 },
  { time: "14:54", wireguard: 28, headscale: 17 },
];

const throughputData = [
  { time: "14:45", value: 72 },
  { time: "14:46", value: 76 },
  { time: "14:47", value: 71 },
  { time: "14:48", value: 79 },
  { time: "14:49", value: 82 },
  { time: "14:50", value: 85 },
  { time: "14:51", value: 81 },
  { time: "14:52", value: 88 },
  { time: "14:53", value: 84 },
  { time: "14:54", value: 80 },
];

const benchmarkHistory = [
  {
    id: 1,
    timestamp: "2025-05-27 15:10:12",
    mode: "WireGuard",
    duration: "02:00",
    latency: 28.6,
    packetLoss: 0.21,
    throughput: 72.4,
    cpu: 18.7,
    status: "Success",
  },
  {
    id: 2,
    timestamp: "2025-05-27 15:04:10",
    mode: "Headscale",
    duration: "02:00",
    latency: 18.7,
    packetLoss: 0.14,
    throughput: 54.1,
    cpu: 15.5,
    status: "Success",
  },
];

function App() {
  const [mode, setMode] = useState("wireguard");

  const benchmark = {
    avgLatency: 28.6,
    packetLoss: 0.21,
    cpuUsage: 18.7,
    uptime: "02:18:43",
  };

  return (
    <div className="min-h-screen bg-[#050b16] text-white">
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-6">
        <Header mode={mode} setMode={(bool) => setMode(bool)} />
        {/* KPI SECTION */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Performance Summary
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Average Latency"
              value={benchmark.avgLatency}
              unit="ms"
              accentColor="#3b82f6"
              icon={<Activity size={22} />}
              comparison="+9.9 ms"
              comparisonLabel="vs Headscale:"
            />

            <StatCard
              title="Packet Loss"
              value={benchmark.packetLoss}
              unit="%"
              accentColor="#14b8a6"
              icon={<CircleDot size={22} />}
              comparison="+0.07%"
              comparisonLabel="vs Headscale:"
            />

            <StatCard
              title="CPU Usage"
              value={benchmark.cpuUsage}
              unit="%"
              accentColor="#f59e0b"
              icon={<Cpu size={22} />}
              comparison="+3.2%"
              comparisonLabel="vs Headscale:"
            />

            <StatCard
              title="Tunnel Uptime"
              value={benchmark.uptime}
              accentColor="#a855f7"
              icon={<Clock3 size={22} />}
            />
          </div>
        </section>


        {/* TOPOLOGY */}
        <section>
          <NetworkTopology
            mode={
              mode === "wireguard"
                ? "WireGuard"
                : "Headscale"
            }
            protocol="UDP"
            port="51820"
            rtt={25.4}
            packetLoss={0.21}
            source={{
              name: "VM1",
              ip: "10.0.0.1",
            }}
            target={{
              name: "VM2",
              ip: "10.0.0.2",
            }}
          />
        </section>

        {/* LATENCY */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Latency Analysis
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            <LatencyChart data={latencyData} />
            <LatencyChart data={latencyData} />
          </div>
        </section>

        {/* THROUGHPUT */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Throughput Analysis
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            <ThroughputChart
              title="WireGuard Throughput"
              data={throughputData}
              color="#3b82f6"
            />

            <ThroughputChart
              title="Headscale Throughput"
              data={throughputData}
              color="#14b8a6"
            />
          </div>
        </section>

        {/* HISTORY */}
        <section>
          <BenchmarkHistory
            data={benchmarkHistory}
          />
        </section>
        <Footer />
      </main>
    </div>
  );
}

export default App;