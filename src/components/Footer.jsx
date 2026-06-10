export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-800 bg-slate-950/40">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          
          <div>
            <h3 className="text-lg font-semibold text-white">
              VPN Performance Monitoring Dashboard
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Comparative analysis of WireGuard and Headscale VPN
              architectures using real-time latency, throughput,
              packet loss, and system performance metrics.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <a
              href="https://github.com/samay15jan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-300 transition hover:text-white"
            >
              GitHub Profile
            </a>

            <span className="text-sm text-slate-500">
              Crafted by Samay Kumar
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
          Final Year Project • B.Tech Information Technology • 2026
        </div>
      </div>
    </footer>
  );
}