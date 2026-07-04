import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ReportView from "../components/Dashboard/ReportView";
import { getReport } from "../services/api";

export default function Results() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await getReport(token);
        setSession(data);
      } catch (err) {
        setError(err.message || "Unable to load report.");
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-blue-500" />
          <p className="text-sm text-zinc-500">
            Loading report...
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
        <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <h1 className="mb-3 text-lg font-medium text-zinc-50">
            Report not found
          </h1>

          <p className="mb-6 text-sm text-zinc-500">
            {error || "This benchmark report does not exist or has expired."}
          </p>

          <button
            onClick={() => navigate("/")}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReportView
      session={session}
      onBack={() => navigate("/")}
    />
  );
}