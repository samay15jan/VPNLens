import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";

import StatCard from "../components/Dashboard/StatCard";
import LatencyChart from "../components/Dashboard/LatencyChart";
import ThroughputChart from "../components/Dashboard/ThroughputChart";
import NetworkTopology from "../components/Dashboard/NetworkTopology";
import BenchmarkHistory from "../components/Dashboard/BenchmarkHistory";
import StartBenchmarkModal from "../components/Dashboard/StartBenchmarkModal";

import {
    Activity,
    Cpu,
    Clock3,
    CircleDot,
    Play,
} from "lucide-react";

import {
    getResults,
    getSummary,
    startBenchmark,
} from "../services/api";

function indexSummary(data) {
    if (!Array.isArray(data)) return {};

    return Object.fromEntries(
        data.map((row) => [row.vpn, row])
    );
}

function parseTs(ts) {
    if (!ts) return null;

    const d = new Date(ts);

    return isNaN(d) ? null : d;
}

function toLatencyPoints(results, vpn) {
    return results
        .filter((r) => r.vpn === vpn && r.latency_avg != null)
        .sort(
            (a, b) =>
                new Date(a.recorded_at) -
                new Date(b.recorded_at)
        )
        .slice(-10)
        .map((r) => ({
            time: parseTs(r.recorded_at)?.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            ),
            latency: r.latency_avg,
        }));
}

function toThroughputPoints(
    results,
    vpn,
    direction = "upload"
) {
    return results
        .filter(
            (r) =>
                r.vpn === vpn &&
                r[`throughput_${direction}`] != null
        )
        .sort(
            (a, b) =>
                new Date(a.recorded_at) -
                new Date(b.recorded_at)
        )
        .slice(-10)
        .map((r) => ({
            time: parseTs(r.recorded_at)?.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            ),
            value: r[`throughput_${direction}`],
        }));
}

function toBenchmarkRows(results) {
    return [...results]
        .sort(
            (a, b) =>
                new Date(b.recorded_at) -
                new Date(a.recorded_at)
        )
        .map((r) => ({
            id: r.id,
            timestamp:
                parseTs(r.recorded_at)?.toLocaleString() ??
                "—",
            mode:
                r.vpn === "wireguard"
                    ? "WireGuard"
                    : "Headscale",
            duration: "02:00",
            latency: r.latency_avg ?? "—",
            packetLoss: r.packet_loss ?? "—",
            throughput:
                r.throughput_upload ?? "—",
            cpu: r.cpu_avg ?? "—",
            status:
                r.runs_failed === 0
                    ? "Success"
                    : "Partial",
        }));
}

export default function Home() {
    const navigate = useNavigate();

    const [mode, setMode] =
        useState("wireguard");

    const [showModal, setShowModal] =
        useState(false);

    const [results, setResults] =
        useState([]);

    const [summary, setSummary] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [lastRefresh, setLastRefresh] =
        useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [resultsData, summaryData] =
                await Promise.all([
                    getResults(),
                    getSummary(),
                ]);

            setResults(resultsData);

            setSummary(
                indexSummary(summaryData)
            );

            setLastRefresh(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const id = setInterval(
            fetchData,
            15000
        );

        return () => clearInterval(id);
    }, [fetchData]);

    async function handleStart(email) {
        await startBenchmark(email);

        setShowModal(false);

        alert(
            "Benchmark started!\n\nYou'll receive an email with your report once the benchmark finishes."
        );
    }
    
    const currentVpn =
        mode === "wireguard"
            ? "wireguard"
            : "headscale";

    const otherVpn =
        mode === "wireguard"
            ? "headscale"
            : "wireguard";

    const currentStats =
        summary?.[currentVpn];

    const otherStats =
        summary?.[otherVpn];

    const wgLatency =
        toLatencyPoints(
            results,
            "wireguard"
        );

    const hsLatency =
        toLatencyPoints(
            results,
            "headscale"
        );

    const wgThroughput =
        toThroughputPoints(
            results,
            "wireguard"
        );

    const hsThroughput =
        toThroughputPoints(
            results,
            "headscale"
        );

    const benchmarkRows =
        toBenchmarkRows(results);

    const avgLatency =
        currentStats?.latency_avg_avg ??
        "—";

    const packetLoss =
        currentStats?.packet_loss_avg ??
        "—";

    const cpuUsage =
        currentStats?.cpu_avg_avg ??
        "—";

    const otherLabel =
        mode === "wireguard"
            ? "vs Headscale:"
            : "vs WireGuard:";

    const latencyDiff =
        currentStats &&
            otherStats
            ? (
                currentStats.latency_avg_avg -
                otherStats.latency_avg_avg
            ).toFixed(1)
            : null;

    const packetDiff =
        currentStats &&
            otherStats
            ? (
                currentStats.packet_loss_avg -
                otherStats.packet_loss_avg
            ).toFixed(2)
            : null;

    const cpuDiff =
        currentStats &&
            otherStats
            ? (
                currentStats.cpu_avg_avg -
                otherStats.cpu_avg_avg
            ).toFixed(1)
            : null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">

            {showModal && (
                <StartBenchmarkModal
                    onClose={() =>
                        setShowModal(false)
                    }
                    onStart={handleStart}
                />
            )}

            <main className="mx-auto max-w-7xl space-y-10 px-6 py-8">

                <Header
                    mode={mode}
                    setMode={setMode}
                    onRefresh={fetchData}
                    sampleCount={results.length}
                    lastRefresh={lastRefresh}
                    loading={loading}
                />
                {/* Run Benchmark */}
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-6 py-4">
                    <div>
                        <p className="text-sm font-medium text-zinc-200">
                            Ready to run a new benchmark?
                        </p>

                        <p className="mt-0.5 text-xs text-zinc-500">
                            Spins up both VMs, tests WireGuard and Headscale, then emails the
                            final report.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex shrink-0 items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                        <Play size={14} />
                        Run Benchmark
                    </button>
                </div>

                {/* KPI */}
                <section>
                    <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Performance Summary
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Average Latency"
                            value={
                                typeof avgLatency === "number"
                                    ? avgLatency.toFixed(1)
                                    : avgLatency
                            }
                            unit="ms"
                            accentColor="#3b82f6"
                            icon={<Activity size={18} />}
                            comparison={
                                latencyDiff != null
                                    ? `${latencyDiff > 0 ? "+" : ""}${latencyDiff} ms`
                                    : null
                            }
                            comparisonLabel={otherLabel}
                        />

                        <StatCard
                            title="Packet Loss"
                            value={
                                typeof packetLoss === "number"
                                    ? packetLoss.toFixed(2)
                                    : packetLoss
                            }
                            unit="%"
                            accentColor="#14b8a6"
                            icon={<CircleDot size={18} />}
                            comparison={
                                packetDiff != null
                                    ? `${packetDiff > 0 ? "+" : ""}${packetDiff}%`
                                    : null
                            }
                            comparisonLabel={otherLabel}
                        />

                        <StatCard
                            title="CPU Usage"
                            value={
                                typeof cpuUsage === "number"
                                    ? cpuUsage.toFixed(1)
                                    : cpuUsage
                            }
                            unit="%"
                            accentColor="#f59e0b"
                            icon={<Cpu size={18} />}
                            comparison={
                                cpuDiff != null
                                    ? `${cpuDiff > 0 ? "+" : ""}${cpuDiff}%`
                                    : null
                            }
                            comparisonLabel={otherLabel}
                        />

                        <StatCard
                            title="Total Runs"
                            value={currentStats?.total_runs ?? (loading ? "…" : "0")}
                            accentColor="#a855f7"
                            icon={<Clock3 size={18} />}
                        />
                    </div>
                </section>

                {/* Network */}
                <section>
                    <NetworkTopology
                        mode={mode === "wireguard" ? "WireGuard" : "Headscale"}
                        protocol="UDP"
                        port={mode === "wireguard" ? "51820" : "41641"}
                        rtt={typeof avgLatency === "number" ? avgLatency : 0}
                        packetLoss={typeof packetLoss === "number" ? packetLoss : 0}
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

                {/* Latency */}
                <section>
                    <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Latency Analysis
                    </h2>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <LatencyChart
                            title="WireGuard Latency (ms)"
                            data={
                                wgLatency.length
                                    ? wgLatency
                                    : [{ time: "—", latency: 0 }]
                            }
                            color="#3b82f6"
                        />

                        <LatencyChart
                            title="Headscale Latency (ms)"
                            data={
                                hsLatency.length
                                    ? hsLatency
                                    : [{ time: "—", latency: 0 }]
                            }
                            color="#64748B"
                        />
                    </div>
                </section>

                {/* Throughput */}
                <section>
                    <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Throughput Analysis
                    </h2>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <ThroughputChart
                            title="WireGuard Throughput"
                            data={
                                wgThroughput.length
                                    ? wgThroughput
                                    : [{ time: "—", value: 0 }]
                            }
                            color="#3b82f6"
                        />

                        <ThroughputChart
                            title="Headscale Throughput"
                            data={
                                hsThroughput.length
                                    ? hsThroughput
                                    : [{ time: "—", value: 0 }]
                            }
                            color="#64748B"
                        />
                    </div>
                </section>

                {/* History */}
                <section>
                    <BenchmarkHistory
                        data={benchmarkRows}
                    />
                </section>

                <Footer />

            </main>
        </div>
    );
}