import { useState } from "react";
import { Shield, X, Loader2 } from "lucide-react";

export default function StartBenchmarkModal({ onClose, onStart }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);
    try {
      await onStart(email.trim());
    } catch (e) {
      setError(e.message || "Failed to start benchmark.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-white transition"
        >
          <X size={20} />
        </button>

        {/* Icon + title */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10">
            <Shield size={24} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Run Benchmark</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Tests WireGuard then Headscale end-to-end
            </p>
          </div>
        </div>

        {/* What will happen */}
        <ul className="mb-6 space-y-2 text-sm text-slate-400">
          {[
            "VMs are provisioned via Terraform",
            "WireGuard tunnel tested first (~2 min)",
            "Headscale tunnel tested second (~2 min)",
            "Results posted to dashboard in real time",
            "Full report emailed when complete",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-blue-500/40 bg-blue-500/10 text-center text-[10px] leading-4 text-blue-400">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>

        {/* Email input */}
        <label className="block text-sm text-slate-400 mb-1.5">
          Email for report
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 transition"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Starting…</> : "Start Benchmark"}
          </button>
        </div>
      </div>
    </div>
  );
}