import { useState } from "react";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 5;

export default function BenchmarkHistory({ data }) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  // Clamp page in case data shrinks
  const safePage = Math.min(page, totalPages - 1);
  const pageData = data.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const start = data.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE + PAGE_SIZE, data.length);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-6 py-4">
        <h2 className="text-lg font-medium text-white">Benchmark History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-4 py-4">Mode</th>
              <th className="px-4 py-4">Duration</th>
              <th className="px-4 py-4">Avg Latency</th>
              <th className="px-4 py-4">Packet Loss</th>
              <th className="px-4 py-4">Throughput</th>
              <th className="px-4 py-4">CPU</th>
              <th className="px-4 py-4">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                  No benchmark results yet. POST to <code className="text-slate-400">/api/results</code> to get started.
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="px-6 py-4 text-sm text-slate-300">{row.timestamp}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${row.mode === "WireGuard" ? "bg-blue-500" : "bg-cyan-400"}`} />
                      <span className="text-sm text-slate-200">{row.mode}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">{row.duration}</td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    {row.latency !== "—" ? `${row.latency} ms` : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    {row.packetLoss !== "—" ? `${row.packetLoss}%` : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    {row.throughput !== "—" ? `${row.throughput} Mbps` : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    {row.cpu !== "—" ? `${row.cpu}%` : "—"}
                  </td>
                  <td className="px-4 py-4">
                    {row.status === "Success" ? (
                      <span className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 size={16} /> Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-yellow-400">
                        <XCircle size={16} /> {row.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-sm text-slate-400">
          {data.length === 0
            ? "No results"
            : `Showing ${start}–${end} of ${data.length}`}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`rounded px-3 py-1.5 text-sm ${
                i === safePage
                  ? "bg-blue-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}