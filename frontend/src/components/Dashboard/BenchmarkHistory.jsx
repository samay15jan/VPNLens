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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h2 className="text-sm font-medium text-zinc-300">Benchmark history</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-600">
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Avg latency</th>
              <th className="px-4 py-3 font-medium">Packet loss</th>
              <th className="px-4 py-3 font-medium">Throughput</th>
              <th className="px-4 py-3 font-medium">CPU</th>
              <th className="px-4 py-3 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-zinc-600">
                  No benchmark results yet. POST to{" "}
                  <code className="text-zinc-500">/api/results</code> to get started.
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/60">
                  <td className="px-6 py-4 text-sm text-zinc-400">{row.timestamp}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          row.mode === "WireGuard" ? "bg-blue-500" : "bg-slate-500"
                        }`}
                      />
                      <span className="text-sm text-zinc-200">{row.mode}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-400">{row.duration}</td>
                  <td className="px-4 py-4 text-sm text-zinc-400">
                    {row.latency !== "—" ? `${row.latency} ms` : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-400">
                    {row.packetLoss !== "—" ? `${row.packetLoss}%` : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-400">
                    {row.throughput !== "—" ? `${row.throughput} Mbps` : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-400">
                    {row.cpu !== "—" ? `${row.cpu}%` : "—"}
                  </td>
                  <td className="px-4 py-4">
                    {row.status === "Success" ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-500">
                        <CheckCircle2 size={14} /> Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-amber-500">
                        <XCircle size={14} /> {row.status}
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
        <p className="text-sm text-zinc-500">
          {data.length === 0
            ? "No results"
            : `Showing ${start}–${end} of ${data.length}`}
        </p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`rounded-md px-2.5 py-1 text-sm ${
                i === safePage
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-800 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
