import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export default function BenchmarkHistory({ data = [] }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = data.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const start = data.length === 0 ? 0 : safePage * pageSize + 1;
  const end = Math.min(safePage * pageSize + pageSize, data.length);

  function goTo(p) {
    setPage(Math.max(0, Math.min(totalPages - 1, p)));
  }

  // Build a compact list of page numbers with ellipses for large datasets
  const pageItems = useMemo(() => {
    const items = [];
    const add = (v) => items.push(v);
    const windowSize = 1;

    for (let i = 0; i < totalPages; i++) {
      const isEdge = i === 0 || i === totalPages - 1;
      const isNear = Math.abs(i - safePage) <= windowSize;
      if (isEdge || isNear) {
        add(i);
      } else if (items[items.length - 1] !== "…") {
        add("…");
      }
    }
    return items;
  }, [totalPages, safePage]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-6 py-4">
        <h2 className="text-sm font-medium text-zinc-300">
          Benchmark history{" "}
          {data.length > 0 && (
            <span className="ml-1 text-xs font-normal text-zinc-600">
              ({data.length} runs)
            </span>
          )}
        </h2>

        {data.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Rows
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-zinc-600"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {data.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-600">
          No benchmark results yet. POST to{" "}
          <code className="text-zinc-500">/api/results</code> to get started.
        </div>
      ) : (
        <>
          {/* Desktop / tablet: scrollable table */}
          <div className="hidden max-h-[28rem] overflow-y-auto overflow-x-auto sm:block">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-zinc-900">
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-600">
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Avg latency</th>
                  <th className="px-4 py-3 font-medium">Packet loss</th>
                  <th className="px-4 py-3 font-medium">Throughput</th>
                  <th className="px-4 py-3 font-medium">CPU</th>
                  <th className="px-4 py-3 font-medium">RAM</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/60">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-400">{row.timestamp}</td>
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
                    <td className="px-4 py-4 text-sm text-zinc-400">
                      {row.ram !== "—" ? `${row.ram} MB` : "—"}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="max-h-[28rem] space-y-3 overflow-y-auto p-4 sm:hidden">
            {pageData.map((row) => (
              <div key={row.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        row.mode === "WireGuard" ? "bg-blue-500" : "bg-slate-500"
                      }`}
                    />
                    <span className="text-sm font-medium text-zinc-200">{row.mode}</span>
                  </div>
                  {row.status === "Success" ? (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle2 size={12} /> Success
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <XCircle size={12} /> {row.status}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-zinc-600">{row.timestamp}</p>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Stat label="Latency" value={row.latency !== "—" ? `${row.latency} ms` : "—"} />
                  <Stat label="Loss" value={row.packetLoss !== "—" ? `${row.packetLoss}%` : "—"} />
                  <Stat label="Thpt" value={row.throughput !== "—" ? `${row.throughput} Mbps` : "—"} />
                  <Stat label="CPU" value={row.cpu !== "—" ? `${row.cpu}%` : "—"} />
                  <Stat label="RAM" value={row.ram !== "—" ? `${row.ram} MB` : "—"} />
                  <Stat label="Dur" value={row.duration} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p className="text-sm text-zinc-500">
              Showing {start}–{end} of {data.length}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goTo(0)}
                disabled={safePage === 0}
                className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 0}
                className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="hidden items-center gap-1.5 sm:flex">
                {pageItems.map((item, i) =>
                  item === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-zinc-700">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goTo(item)}
                      className={`rounded-md px-2.5 py-1 text-sm ${
                        item === safePage
                          ? "bg-blue-600 text-white"
                          : "border border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                      }`}
                    >
                      {item + 1}
                    </button>
                  )
                )}
              </div>

              <span className="text-xs text-zinc-600 sm:hidden">
                {safePage + 1} / {totalPages}
              </span>

              <button
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages - 1}
                className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => goTo(totalPages - 1)}
                disabled={safePage === totalPages - 1}
                className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="font-mono text-zinc-300">{value}</p>
    </div>
  );
}