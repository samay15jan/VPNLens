import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// data: [{ time, upload, download }]
export default function ThroughputChart({ title, data = [], color }) {
  const uploads = data.map((d) => d.upload).filter((v) => v != null);
  const downloads = data.map((d) => d.download).filter((v) => v != null);

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const uploadAvg = avg(uploads);
  const downloadAvg = avg(downloads);
  const lastUpload = uploads[uploads.length - 1] ?? 0;
  const lastDownload = downloads[downloads.length - 1] ?? 0;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>

        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Live
        </span>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid stroke="#27272A" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fill: "#71717A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "#71717A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#111113",
                border: "1px solid #27272A",
                borderRadius: "8px",
                color: "#FAFAFA",
                fontSize: "13px",
              }}
              formatter={(v, name) => [`${v?.toFixed ? v.toFixed(1) : v} Mbps`, name]}
            />

            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#A1A1AA" }}
              formatter={(value) => <span style={{ color: "#A1A1AA" }}>{value}</span>}
            />

            <Bar dataKey="upload" name="Upload" fill={color} radius={[2, 2, 0, 0]} />
            <Bar dataKey="download" name="Download" fill={color} fillOpacity={0.35} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-5 text-xs text-zinc-500">
        <span className="text-zinc-300">
          Avg Up <span className="font-mono">{uploadAvg.toFixed(1)}</span> Mbps
        </span>
        <span className="text-zinc-300">
          Avg Down <span className="font-mono">{downloadAvg.toFixed(1)}</span> Mbps
        </span>
        <span>
          Last Up <span className="font-mono">{lastUpload.toFixed(1)}</span> Mbps
        </span>
        <span>
          Last Down <span className="font-mono">{lastDownload.toFixed(1)}</span> Mbps
        </span>
      </div>
    </div>
  );
}