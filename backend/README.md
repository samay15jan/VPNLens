# VPN Benchmark API

Node.js + SQLite REST backend for storing and querying WireGuard vs Headscale
performance metrics.

---

## Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Runtime  | Node.js (≥ 18)                    |
| Framework| Express 4                         |
| Database | SQLite via `sql.js` (pure JS, no native build needed) |
| File     | `data/benchmark.db` (auto-created)|

---

## Quick start

```bash
npm install
npm start          # http://localhost:3000
# or
PORT=4000 npm start
```

Node ≥ 18: swap `npm start` for `node --watch server.js` for auto-reload during dev.

---

## API

All responses follow:
```json
{ "success": true,  "data": ... }
{ "success": false, "error": "message" }
```

---

### `POST /api/results`
Store one benchmark run.

**Required field**

| Field | Type   | Values                    |
|-------|--------|---------------------------|
| `vpn` | string | `"wireguard"` `"headscale"` |

**Optional numeric fields** (omit or `null` = not measured this run)

| Field                | Unit    | Description                          |
|----------------------|---------|--------------------------------------|
| `latency_min`        | ms      | Minimum RTT from ping                |
| `latency_avg`        | ms      | Average RTT from ping                |
| `latency_max`        | ms      | Maximum RTT from ping                |
| `throughput_upload`  | Mbps    | iperf3 upload                        |
| `throughput_download`| Mbps    | iperf3 download (reverse mode)       |
| `packet_loss`        | %       | 0–100                                |
| `cpu_avg`            | %       | Average CPU usage during benchmark   |
| `cpu_peak`           | %       | Peak CPU usage during benchmark      |
| `mem_avg_mb`         | MB      | Average memory used during benchmark |
| `mem_peak_mb`        | MB      | Peak memory used during benchmark    |
| `connection_time_s`  | seconds | VPN start → tunnel available         |
| `recovery_time_s`    | seconds | Link down → tunnel restored          |
| `runs_successful`    | integer | Successful sub-runs in this batch    |
| `runs_failed`        | integer | Failed sub-runs in this batch        |
| `notes`              | object  | Any extra key/values (stored as JSON)|
| `recorded_at`        | ISO-8601| Override timestamp (default: now)    |

**Example**
```bash
curl -X POST http://localhost:3000/api/results \
  -H 'Content-Type: application/json' \
  -d '{
    "vpn": "wireguard",
    "latency_min": 15,
    "latency_avg": 18,
    "latency_max": 24,
    "throughput_upload": 850,
    "throughput_download": 790,
    "packet_loss": 0.2,
    "cpu_avg": 12.5,
    "cpu_peak": 31.0,
    "mem_avg_mb": 512,
    "mem_peak_mb": 620,
    "connection_time_s": 1.4,
    "recovery_time_s": 5.2,
    "runs_successful": 1,
    "runs_failed": 0
  }'
```

**Response `201`**
```json
{
  "success": true,
  "data": { "id": 1, "vpn": "wireguard", "latency_avg": 18, ... }
}
```

---

### `GET /api/results`
Return all results, newest first.

**Query params**

| Param    | Example                  | Description          |
|----------|--------------------------|----------------------|
| `vpn`    | `?vpn=wireguard`         | Filter by VPN type   |
| `limit`  | `?limit=20`              | Max rows             |
| `offset` | `?limit=20&offset=20`    | Pagination           |

```bash
curl 'http://localhost:3000/api/results?vpn=headscale&limit=10'
```

---

### `GET /api/results/:id`
Return a single result.

```bash
curl http://localhost:3000/api/results/1
```

---

### `GET /api/summary`
Per-VPN aggregated statistics — the comparison table.

Returns `AVG / MIN / MAX` for every metric column, plus:
`total_runs`, `total_successful`, `total_failed`, `success_rate_pct`,
`first_recorded`, `last_recorded`.

```bash
curl http://localhost:3000/api/summary
```

**Example response**
```json
{
  "success": true,
  "data": [
    {
      "vpn": "headscale",
      "total_runs": 5,
      "success_rate_pct": 100,
      "latency_avg_avg": 22,
      "throughput_upload_avg": 720,
      "cpu_avg_avg": 18.2,
      ...
    },
    {
      "vpn": "wireguard",
      "total_runs": 5,
      "success_rate_pct": 100,
      "latency_avg_avg": 18,
      "throughput_upload_avg": 850,
      "cpu_avg_avg": 12.5,
      ...
    }
  ]
}
```

---

## Benchmark scripts

### `scripts/switch.sh <wireguard|headscale>`
Tears down the current VPN, starts the requested one, waits for the tunnel
to pass a ping, then prints the connection time in seconds.

```bash
# Returns connection time on stdout
CONN_TIME=$(sudo bash scripts/switch.sh wireguard)
```

**Configure at the top of the file:**
- `WG_INTERFACE` — wg-quick interface name (default `wg0`)
- `HS_INTERFACE` — Headscale/Tailscale interface (default `tailscale0`)
- `PING_HOST` — a peer reachable through the tunnel (default `10.0.0.1`)
- `HEADSCALE_URL` — env var for the Headscale control server URL

### `scripts/run-benchmark.sh`
Full automated benchmark: switches to WireGuard, collects all metrics, POSTs
results; then repeats for Headscale.

```bash
# Env vars (all optional)
export API_URL="http://localhost:3000"
export IPERF_SERVER="10.0.0.1"
export PING_HOST="10.0.0.1"
export PING_COUNT=50
export IPERF_DURATION=10

sudo bash scripts/run-benchmark.sh
```

**Dependencies on the benchmark node:**
`ping`, `iperf3`, `mpstat` (from `sysstat`), `bc`, `jq`, `curl`

```bash
# Ubuntu/Debian
sudo apt install iperf3 sysstat bc jq curl
```

**What it does per leg:**
1. `switch.sh <vpn>` — brings up VPN, measures connection time
2. `ping` — latency min/avg/max + packet loss
3. `iperf3` — upload + download throughput
4. `mpstat` in background — CPU avg + peak
5. `free -m` samples — memory avg + peak
6. Brief link-down/up — recovery time
7. `POST /api/results` with all collected values

---

## File layout

```
vpn-benchmark-api/
├── server.js          # Express app + route definitions
├── db.js              # sql.js database layer + all queries
├── validate.js        # Input validation
├── package.json
├── data/
│   └── benchmark.db   # SQLite file (auto-created on first run)
└── scripts/
    ├── switch.sh       # VPN switcher
    └── run-benchmark.sh# Full automated benchmark runner
```
