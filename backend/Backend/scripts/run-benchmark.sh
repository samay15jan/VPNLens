#!/usr/bin/env bash
# run-benchmark.sh
# Runs a full benchmark for both WireGuard and Headscale and POSTs results
# to the backend API.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── config (override via env) ─────────────────────────────────────────────────
API_URL="${API_URL:-http://localhost:3000}"
IPERF_SERVER="${IPERF_SERVER:-10.0.0.1}"   # iperf3 server on the remote peer
PING_HOST="${PING_HOST:-10.0.0.1}"          # host to ping through the VPN
PING_COUNT="${PING_COUNT:-50}"              # number of ping packets
IPERF_DURATION="${IPERF_DURATION:-10}"      # iperf3 test duration (seconds)
CPU_SAMPLE_INTERVAL=1                       # mpstat sample interval (seconds)

# ── helpers ───────────────────────────────────────────────────────────────────
log()  { echo "[benchmark] $*"; }
die()  { echo "[benchmark] ERROR: $*" >&2; exit 1; }

require() { command -v "$1" &>/dev/null || die "Required tool not found: $1"; }
require ping
require iperf3
require mpstat
require bc
require jq
require curl

# ── latency + packet-loss via ping ────────────────────────────────────────────
collect_ping() {
  log "  ping $PING_HOST ($PING_COUNT packets)..."
  local raw
  raw=$(ping -c "$PING_COUNT" -i 0.2 "$PING_HOST" 2>&1)

  # rtt min/avg/max/mdev line:  "rtt min/avg/max/mdev = 14.8/18.3/24.1/1.9 ms"
  local stats
  stats=$(echo "$raw" | grep -E '^(rtt|round-trip)' | grep -oE '[0-9]+\.[0-9]+/[0-9]+\.[0-9]+/[0-9]+\.[0-9]+')
  LATENCY_MIN=$(echo "$stats" | cut -d/ -f1)
  LATENCY_AVG=$(echo "$stats" | cut -d/ -f2)
  LATENCY_MAX=$(echo "$stats" | cut -d/ -f3)

  # packet loss line: "2 packets transmitted, 2 received, 0% packet loss"
  PACKET_LOSS=$(echo "$raw" | grep -oE '[0-9]+(\.[0-9]+)?% packet loss' | grep -oE '[0-9]+(\.[0-9]+)?')

  log "  latency min/avg/max: ${LATENCY_MIN}/${LATENCY_AVG}/${LATENCY_MAX} ms  loss: ${PACKET_LOSS}%"
}

# ── throughput via iperf3 ─────────────────────────────────────────────────────
collect_iperf() {
  log "  iperf3 upload to $IPERF_SERVER (${IPERF_DURATION}s)..."
  local up_json
  up_json=$(iperf3 -c "$IPERF_SERVER" -t "$IPERF_DURATION" -J 2>/dev/null)
  THROUGHPUT_UPLOAD=$(echo "$up_json" \
    | jq '.end.sum_sent.bits_per_second / 1000000 | . * 100 | round / 100')

  log "  iperf3 download from $IPERF_SERVER (${IPERF_DURATION}s)..."
  local down_json
  down_json=$(iperf3 -c "$IPERF_SERVER" -t "$IPERF_DURATION" -R -J 2>/dev/null)
  THROUGHPUT_DOWNLOAD=$(echo "$down_json" \
    | jq '.end.sum_received.bits_per_second / 1000000 | . * 100 | round / 100')

  log "  throughput up/down: ${THROUGHPUT_UPLOAD}/${THROUGHPUT_DOWNLOAD} Mbps"
}

# ── CPU + memory during a background workload window ─────────────────────────
start_resource_collection() {
  # mpstat writes per-second CPU snapshots to a temp file
  CPU_TMPFILE=$(mktemp /tmp/bench_cpu.XXXXXX)
  MEM_TMPFILE=$(mktemp /tmp/bench_mem.XXXXXX)

  mpstat "$CPU_SAMPLE_INTERVAL" 9999 > "$CPU_TMPFILE" 2>&1 &
  MPSTAT_PID=$!

  # Sample memory (RSS of system — free reports in kB) every second
  (while kill -0 "$MPSTAT_PID" 2>/dev/null; do
     free -m | awk '/^Mem:/{print $3}' >> "$MEM_TMPFILE"
     sleep "$CPU_SAMPLE_INTERVAL"
   done) &
  MEM_SAMPLER_PID=$!
}

stop_resource_collection() {
  kill "$MPSTAT_PID"   2>/dev/null || true
  kill "$MEM_SAMPLER_PID" 2>/dev/null || true
  wait "$MPSTAT_PID"   2>/dev/null || true

  # Parse CPU idle → usage
  #   mpstat lines: "HH:MM:SS  all  usr  nice  sys  iowait  irq  soft  steal  guest  gnice  idle"
  local usage_lines
  usage_lines=$(grep -E '^[0-9]{2}:' "$CPU_TMPFILE" | grep 'all' | awk '{print 100 - $NF}')

  CPU_AVG=$(echo "$usage_lines" | awk '{s+=$1;c++} END {printf "%.2f", s/c}')
  CPU_PEAK=$(echo "$usage_lines" | awk 'BEGIN{m=0} {if($1>m)m=$1} END {printf "%.2f", m}')

  # Parse memory
  MEM_AVG=$(awk '{s+=$1;c++} END {printf "%.0f", s/c}' "$MEM_TMPFILE")
  MEM_PEAK=$(awk 'BEGIN{m=0} {if($1>m)m=$1} END {printf "%.0f", m}' "$MEM_TMPFILE")

  rm -f "$CPU_TMPFILE" "$MEM_TMPFILE"
  log "  cpu avg/peak: ${CPU_AVG}%/${CPU_PEAK}%   mem avg/peak: ${MEM_AVG}/${MEM_PEAK} MB"
}

# ── recovery time (simulate a brief network interruption) ─────────────────────
measure_recovery() {
  local iface="$1"   # e.g. wg0 or tailscale0
  log "  simulating network interruption on $iface..."

  local start
  start=$(date +%s%N)

  ip link set "$iface" down
  sleep 2
  ip link set "$iface" up

  # Wait until ping comes back
  local deadline=$(( $(date +%s) + 30 ))
  while (( $(date +%s) < deadline )); do
    if ping -c1 -W1 "$PING_HOST" &>/dev/null; then break; fi
    sleep 0.5
  done

  local end
  end=$(date +%s%N)
  RECOVERY_TIME_S=$(echo "scale=3; ($end - $start) / 1000000000" | bc)
  log "  recovery time: ${RECOVERY_TIME_S}s"
}

# ── POST to API ───────────────────────────────────────────────────────────────
post_result() {
  local vpn="$1"
  local conn_time="$2"

  local payload
  payload=$(jq -n \
    --arg  vpn                "$vpn" \
    --argjson latency_min     "${LATENCY_MIN:-null}" \
    --argjson latency_avg     "${LATENCY_AVG:-null}" \
    --argjson latency_max     "${LATENCY_MAX:-null}" \
    --argjson throughput_upload   "${THROUGHPUT_UPLOAD:-null}" \
    --argjson throughput_download "${THROUGHPUT_DOWNLOAD:-null}" \
    --argjson packet_loss     "${PACKET_LOSS:-null}" \
    --argjson cpu_avg         "${CPU_AVG:-null}" \
    --argjson cpu_peak        "${CPU_PEAK:-null}" \
    --argjson mem_avg_mb      "${MEM_AVG:-null}" \
    --argjson mem_peak_mb     "${MEM_PEAK:-null}" \
    --argjson connection_time_s "${conn_time:-null}" \
    --argjson recovery_time_s "${RECOVERY_TIME_S:-null}" \
    --argjson runs_successful 1 \
    --argjson runs_failed     0 \
    '{
      vpn:                $vpn,
      latency_min:        $latency_min,
      latency_avg:        $latency_avg,
      latency_max:        $latency_max,
      throughput_upload:  $throughput_upload,
      throughput_download:$throughput_download,
      packet_loss:        $packet_loss,
      cpu_avg:            $cpu_avg,
      cpu_peak:           $cpu_peak,
      mem_avg_mb:         $mem_avg_mb,
      mem_peak_mb:        $mem_peak_mb,
      connection_time_s:  $connection_time_s,
      recovery_time_s:    $recovery_time_s,
      runs_successful:    $runs_successful,
      runs_failed:        $runs_failed
    }')

  log "  POSTing to $API_URL/api/results..."
  local response
  response=$(curl -sf -X POST "$API_URL/api/results" \
    -H 'Content-Type: application/json' \
    -d "$payload")

  local saved_id
  saved_id=$(echo "$response" | jq -r '.data.id')
  log "  saved as result id=$saved_id"
}

# ── run one VPN leg ───────────────────────────────────────────────────────────
run_leg() {
  local vpn="$1"
  local iface="$2"

  log "=========================================="
  log "Starting leg: $vpn"
  log "=========================================="

  local conn_time
  conn_time=$("$SCRIPT_DIR/switch.sh" "$vpn")

  start_resource_collection

  collect_ping
  collect_iperf
  measure_recovery "$iface"

  stop_resource_collection

  post_result "$vpn" "$conn_time"
}

# ── main ──────────────────────────────────────────────────────────────────────
log "VPN Benchmark starting — $(date -u +%Y-%m-%dT%H:%M:%SZ)"

run_leg "wireguard" "wg0"
run_leg "headscale" "tailscale0"

log "All done. View results: GET $API_URL/api/summary"
