import { Server, Lock } from "lucide-react";

export default function NetworkTopology() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
      <h2 className="mb-8 text-lg font-medium text-white">
        Network Topology
      </h2>

      <div className="relative flex items-center justify-between">
        {/* VM1 */}
        <div className="z-10 flex flex-col items-center">
          <div className="flex h-32 w-40 flex-col items-center justify-center rounded-xl border border-blue-500/50 bg-slate-900">
            <Server className="mb-3 text-slate-300" size={32} />

            <h3 className="text-lg text-white">VM1</h3>

            <p className="text-sm text-slate-400">
              10.0.0.1
            </p>

            <span className="mt-2 text-xs text-green-400">
              ● Online
            </span>
          </div>
        </div>

        {/* Connection Line */}
        <div className="absolute left-[22%] right-[22%] top-1/2 -translate-y-1/2">
          <div className="relative h-[2px] bg-blue-500/40">
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <div className="rounded-full border border-slate-700 bg-slate-900 p-3">
                <Lock
                  size={20}
                  className="text-slate-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Info */}
        <div className="absolute left-1/2 top-full mt-4 -translate-x-1/2 text-center">
          <p className="text-sm text-slate-400">
            Active Tunnel
          </p>

          <p className="mt-1 font-medium text-blue-400">
            WireGuard (Centralized)
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Encrypted • UDP • 51820
          </p>

          <p className="mt-1 text-xs text-slate-400">
            RTT:
            <span className="ml-1 text-blue-400">
              25.4 ms
            </span>

            <span className="mx-2">|</span>

            Loss:
            <span className="ml-1 text-cyan-400">
              0.21%
            </span>
          </p>
        </div>

        {/* VM2 */}
        <div className="z-10 flex flex-col items-center">
          <div className="flex h-32 w-40 flex-col items-center justify-center rounded-xl border border-blue-500/50 bg-slate-900">
            <Server className="mb-3 text-slate-300" size={32} />

            <h3 className="text-lg text-white">VM2</h3>

            <p className="text-sm text-slate-400">
              10.0.0.2
            </p>

            <span className="mt-2 text-xs text-green-400">
              ● Online
            </span>
          </div>
        </div>
      </div>

      <div className="h-32" />
    </div>
  );
}