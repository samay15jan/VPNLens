import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

export default function BenchmarkHistory({ data }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-6 py-4">
        <h2 className="text-lg font-medium text-white">
          Benchmark History
        </h2>
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
            {data.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-800/50 hover:bg-slate-900/50"
              >
                <td className="px-6 py-4 text-sm text-slate-300">
                  {row.timestamp}
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        row.mode === "WireGuard"
                          ? "bg-blue-500"
                          : "bg-cyan-400"
                      }`}
                    />

                    <span className="text-sm text-slate-200">
                      {row.mode}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4 text-sm text-slate-300">
                  {row.duration}
                </td>

                <td className="px-4 py-4 text-sm text-slate-300">
                  {row.latency} ms
                </td>

                <td className="px-4 py-4 text-sm text-slate-300">
                  {row.packetLoss}%
                </td>

                <td className="px-4 py-4 text-sm text-slate-300">
                  {row.throughput} Mbps
                </td>

                <td className="px-4 py-4 text-sm text-slate-300">
                  {row.cpu}%
                </td>

                <td className="px-4 py-4">
                  <span className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 size={16} />
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-sm text-slate-400">
          Showing 1 to {data.length} of {data.length} results
        </p>

        <div className="flex items-center gap-2">
          <button className="rounded border border-slate-700 p-2 text-slate-400 hover:bg-slate-800">
            <ChevronLeft size={16} />
          </button>

          <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
            1
          </button>

          <button className="rounded border border-slate-700 p-2 text-slate-400 hover:bg-slate-800">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}