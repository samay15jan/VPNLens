const API = "https://backend.vpn.samay15jan.com/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let json;

  try {
    json = await response.json();
  } catch {
    throw new Error("Invalid server response.");
  }

  if (!response.ok || json.success === false) {
    throw new Error(json.error || "Request failed.");
  }

  return json.data;
}

// Dashboard

export function getResults() {
  return request("/results");
}

export function getSummary() {
  return request("/summary");
}

// Benchmark

export function startBenchmark(email) {
  return request("/benchmark/start", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Public report

export function getReport(token) {
  return request(`/results/${token}`);
}