const ORIGIN = "https://backend.vpn.samay15jan.com";
const API = `${ORIGIN}/api`;

async function requestFrom(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
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

function request(path, options = {}) {
  return requestFrom(API, path, options);
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
// NOTE: this route lives at the API root (/results/:token), NOT under /api —
// benchmark.js mounts it unprefixed in server.js. Do not route this through
// `request()`/API base or it collides with GET /api/results/:id (numeric)
// and 400s on a hex token.
export function getReport(token) {
  return requestFrom(ORIGIN, `/results/${token}`);
}