import { Menu, RefreshCw, Shield } from "lucide-react";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-slate-800 bg-[#050B16]">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-white">
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-blue-500/30 bg-blue-500/10">
            <Shield size={20} className="text-blue-500" />
          </div>

          <h1 className="text-xl font-medium text-white tracking-wide">
            VPNLens
          </h1>
        </div>
      </div>

      {/* Center */}
      <div className="hidden md:flex items-center gap-5">
        <span className="text-slate-400 text-sm">
          Active Mode:
        </span>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-blue-400 text-sm">
            WireGuard (Centralized)
          </span>
        </div>

        <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
          <button className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm">
            WireGuard
          </button>

          <button className="px-4 py-1.5 rounded-md text-slate-400 hover:text-white text-sm">
            Headscale
          </button>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-white transition">
          <RefreshCw size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-green-400 text-sm">Live</span>
        </div>
      </div>
    </header>
  );
}