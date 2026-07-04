export default function Footer() {
  return (
    <footer className="mt-12 border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

          <div>
            <h3 className="text-sm font-medium text-zinc-200">
              VPN Performance Monitoring Dashboard
            </h3>

            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Comparative analysis of WireGuard and Headscale VPN
              architectures using real-time latency, throughput,
              packet loss, and system performance metrics.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2.5 md:items-end">
            <a
              href="https://github.com/samay15jan/VPNLens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              GitHub Profile
            </a>

            <span className="text-sm text-zinc-600">
              Crafted by Samay Kumar
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
