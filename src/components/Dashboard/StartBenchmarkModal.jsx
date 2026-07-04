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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-7 shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-600 hover:text-zinc-300 transition"
        >
          <X size={18} />
        </button>

        {/* Icon + title */}
        <div className="mb-6 flex items-center gap-3.5">
          <Shield size={20} className="text-zinc-400" strokeWidth={1.75} />
          <div>
            <h2 className="text-base font-medium text-zinc-50">Run benchmark</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Tests WireGuard then Headscale end-to-end
            </p>
          </div>
        </div>

        {/* What will happen */}
        <ul className="mb-6 space-y-2 text-sm text-zinc-500">
          {[
            "VMs are provisioned via Terraform",
            "WireGuard tunnel tested first (~2 min)",
            "Headscale tunnel tested second (~2 min)",
            "Results posted to dashboard in real time",
            "Full report emailed when complete",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-700 text-center text-[10px] leading-4 text-zinc-500">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>

        {/* Email input */}
        <label className="block text-sm text-zinc-500 mb-1.5">
          Email for report
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="you@example.com"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600"
        />
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-zinc-800 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 transition"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Starting…</> : "Start benchmark"}
          </button>
        </div>
      </div>
    </div>
  );
}
