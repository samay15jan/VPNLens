#!/usr/bin/env bash
#
# run-benchmark.sh — runs one full benchmark cycle for a given VPN and posts
# the result to the backend.
#
# Usage:
#   ./run-benchmark.sh wireguard
#   ./run-benchmark.sh tailscale     (posted to backend as "headscale")
#
# Pipeline:
#   1. switch.sh <vpn>            — establish the tunnel, capture Connection Time
#   2. ping                        — latency min/avg/max + packet loss
#   3. iperf3 (normal + reverse)   — upload / download throughput
#   4. system CPU/Mem sampling     — taken in background during steps 2-3
#   5. recovery test                — ip link down, re-verify, time to recover
#   6. POST /api/results            — submit everything to the backend
#
# Assumptions (confirmed / stated explicitly — fix the CONFIG block if wrong):
#   - iperf3 server is running on Server 1 on port 5201, reachable on both
#     the WireGuard subnet (10.8.0.1) and the Tailscale subnet (100.64.0.1).
#   - CPU/Mem are sampled SYSTEM-WIDE (not per-process), for both VPNs, so
#     numbers are directly comparable even though WireGuard has no single
#     userspace process to sample. This is a deliberate simplification —
#     noted here so it can be called out explicitly in the report.
#   - Backend expects vpn label "wireguard" or "headscale" (NOT "tailscale").
#     switch.sh's CLI arg stays "tailscale" (that's the correct tool name);
#     this script translates it to "headscale" only for the API payload.
#
set -u
set -o pipefail

# ───────────────────────── CONFIG ─────────────────────────

SWITCH_SCRIPT="./switch.sh"

SERVER1_WG_IP="10.8.0.1"
SERVER1_TS_IP="100.64.0.1"
IPERF3_PORT=5201

PING_COUNT=20                 # number of pings for latency/packet-loss sample
IPERF3_DURATION=10            # seconds per throughput test (upload, then download)

CPU_MEM_SAMPLE_INTERVAL=1     # seconds between resource samples during the test window

API_BASE_URL="https://backend.vpn.samay15jan.com"   # confirmed working endpoint
API_RESULTS_ENDPOINT="${API_BASE_URL}/api/results"

HEADSCALE_LOGIN_SERVER="https://hs.vpn.samay15jan.com"

# ───────────────────────────────────────────────────────────

TARGET_VPN="${1:-}"
BENCHMARK_TOKEN="${2:-}"

log() { echo "[run-benchmark.sh] $*" >&2; }

if [ "$TARGET_VPN" != "wireguard" ] && [ "$TARGET_VPN" != "tailscale" ]; then
    log "Usage: $0 <wireguard|tailscale>"
    exit 1
fi

# Backend's vpn label differs from switch.sh's CLI arg for the tailscale case.
case "$TARGET_VPN" in
    wireguard) VPN_LABEL="wireguard" ; TARGET_IP="$SERVER1_WG_IP" ;;
    tailscale) VPN_LABEL="headscale" ; TARGET_IP="$SERVER1_TS_IP" ;;
esac

# ───────────────────────── Step 1 — switch ─────────────────────────

log "Switching to ${TARGET_VPN}..."
SWITCH_JSON=$("$SWITCH_SCRIPT" "$TARGET_VPN")
SWITCH_EXIT=$?

SWITCH_SUCCESS=$(echo "$SWITCH_JSON" | grep -o '"success": *[a-z]*' | grep -o '[a-z]*$')

if [ "$SWITCH_EXIT" -ne 0 ] || [ "$SWITCH_SUCCESS" != "true" ]; then
    log "switch.sh failed — recording a failed run and skipping benchmark."
    # Still POST a record so failed switches show up in your data, per
    # runs_failed / runs_successful fields in the schema.
    curl -sS -X POST "$API_RESULTS_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{\"vpn\": \"${VPN_LABEL}\", \"runs_successful\": 0, \"runs_failed\": 1, \"notes\": \"switch.sh failed: $(echo "$SWITCH_JSON" | tr -d '\n')\"}" \
        > /dev/null
    exit 1
fi

CONNECTION_TIME_S=$(echo "$SWITCH_JSON" | grep -o '"total_duration_sec": *[0-9.]*' | grep -o '[0-9.]*$')
log "Connection established in ${CONNECTION_TIME_S}s."

# ───────────────────────── Step 2/3/4 — start resource sampling, run ping + iperf3 ─────────────────────────

CPU_SAMPLES_FILE=$(mktemp)
MEM_SAMPLES_FILE=$(mktemp)

sample_resources() {
    # Runs until killed. Appends one CPU% and one Mem(MB) reading per interval.
    # CPU: 100 - idle%, from `top` in batch mode (system-wide).
    # Mem: used memory in MB, from `free`.
    while true; do
        top -bn1 | grep "Cpu(s)" | awk -F'id,' '{ split($1, a, ","); idle=a[length(a)]; gsub(/[^0-9.]/,"",idle); print 100-idle }' >> "$CPU_SAMPLES_FILE"
        free -m | awk '/^Mem:/{print $3}' >> "$MEM_SAMPLES_FILE"
        sleep "$CPU_MEM_SAMPLE_INTERVAL"
    done
}

sample_resources &
SAMPLER_PID=$!

cleanup_sampler() {
    kill "$SAMPLER_PID" &>/dev/null
    wait "$SAMPLER_PID" 2>/dev/null
}
trap cleanup_sampler EXIT

log "Running ping test (${PING_COUNT} packets) against ${TARGET_IP}..."
PING_OUTPUT=$(ping -c "$PING_COUNT" "$TARGET_IP" 2>/dev/null)

# The rtt/round-trip summary line looks like:
#   rtt min/avg/max/mdev = 0.788/1.116/1.615/0.302 ms
# Extract everything after "= " up to " ms", then split on "/".
RTT_LINE=$(echo "$PING_OUTPUT" | grep "rtt\|round-trip")
RTT_VALUES=$(echo "$RTT_LINE" | grep -oP '(?<== )[0-9.]+/[0-9.]+/[0-9.]+/[0-9.]+')
LATENCY_MIN=$(echo "$RTT_VALUES" | cut -d'/' -f1)
LATENCY_AVG=$(echo "$RTT_VALUES" | cut -d'/' -f2)
LATENCY_MAX=$(echo "$RTT_VALUES" | cut -d'/' -f3)
PACKET_LOSS=$(echo "$PING_OUTPUT" | grep -oP '[0-9.]+(?=% packet loss)')

log "Latency — min: ${LATENCY_MIN}ms avg: ${LATENCY_AVG}ms max: ${LATENCY_MAX}ms, loss: ${PACKET_LOSS}%"

log "Running iperf3 upload test (${IPERF3_DURATION}s) against ${TARGET_IP}:${IPERF3_PORT} — silent for ${IPERF3_DURATION}s due to JSON mode, this is expected, not a hang..."
IPERF_UP_JSON=$(timeout $((IPERF3_DURATION + 15)) iperf3 -c "$TARGET_IP" -p "$IPERF3_PORT" -t "$IPERF3_DURATION" -J 2>/dev/null)
if command -v jq &>/dev/null; then
    THROUGHPUT_UPLOAD=$(echo "$IPERF_UP_JSON" | jq -r '.end.sum_sent.bits_per_second // empty')
else
    THROUGHPUT_UPLOAD=$(echo "$IPERF_UP_JSON" | grep -A4 '"sum_sent"' | grep -o '"bits_per_second":[0-9.]*' | head -1 | cut -d: -f2)
fi
THROUGHPUT_UPLOAD_MBPS=$(awk -v bps="${THROUGHPUT_UPLOAD:-0}" 'BEGIN{ printf "%.1f", bps/1000000 }')

log "Running iperf3 download test (reverse, ${IPERF3_DURATION}s) — also silent until done, expected..."
IPERF_DOWN_JSON=$(timeout $((IPERF3_DURATION + 15)) iperf3 -c "$TARGET_IP" -p "$IPERF3_PORT" -t "$IPERF3_DURATION" -R -J 2>/dev/null)
if command -v jq &>/dev/null; then
    THROUGHPUT_DOWNLOAD=$(echo "$IPERF_DOWN_JSON" | jq -r '.end.sum_received.bits_per_second // empty')
else
    THROUGHPUT_DOWNLOAD=$(echo "$IPERF_DOWN_JSON" | grep -A4 '"sum_received"' | grep -o '"bits_per_second":[0-9.]*' | head -1 | cut -d: -f2)
fi
THROUGHPUT_DOWNLOAD_MBPS=$(awk -v bps="${THROUGHPUT_DOWNLOAD:-0}" 'BEGIN{ printf "%.1f", bps/1000000 }')

log "Throughput — upload: ${THROUGHPUT_UPLOAD_MBPS} Mbps, download: ${THROUGHPUT_DOWNLOAD_MBPS} Mbps"

# Stop sampling now that the active test window is over.
cleanup_sampler
trap - EXIT

CPU_AVG=$(awk '{sum+=$1; n++} END{ if(n>0) printf "%.1f", sum/n; else print "null" }' "$CPU_SAMPLES_FILE")
CPU_PEAK=$(sort -n "$CPU_SAMPLES_FILE" | tail -1)
MEM_AVG_MB=$(awk '{sum+=$1; n++} END{ if(n>0) printf "%.0f", sum/n; else print "null" }' "$MEM_SAMPLES_FILE")
MEM_PEAK_MB=$(sort -n "$MEM_SAMPLES_FILE" | tail -1)

rm -f "$CPU_SAMPLES_FILE" "$MEM_SAMPLES_FILE"

log "CPU — avg: ${CPU_AVG}% peak: ${CPU_PEAK}%, Mem — avg: ${MEM_AVG_MB}MB peak: ${MEM_PEAK_MB}MB"

# ───────────────────────── Step 5 — recovery time ─────────────────────────

case "$TARGET_VPN" in
    wireguard) IFACE="wg0" ;;
    tailscale) IFACE="tailscale0" ;;
esac

log "Simulating a network blip on ${TARGET_VPN}..."
RECOVERY_START=$(date +%s)

if [ "$TARGET_VPN" = "wireguard" ]; then
    sudo wg-quick down "$IFACE" &>/dev/null
    sudo wg-quick up "$IFACE" &>/dev/null
else
    sudo tailscale down
    sudo tailscale up --login-server="$HEADSCALE_LOGIN_SERVER"
fi

RECOVERY_TIMEOUT=30
RECOVERED="false"
while [ "$(( $(date +%s) - RECOVERY_START ))" -lt "$RECOVERY_TIMEOUT" ]; do
    if ping -c 1 -W 2 "$TARGET_IP" &>/dev/null; then
        RECOVERED="true"
        break
    fi
    sleep 1
done
RECOVERY_END=$(date +%s)
RECOVERY_TIME_S=$(( RECOVERY_END - RECOVERY_START ))

if [ "$RECOVERED" = "true" ]; then
    log "Recovered in ${RECOVERY_TIME_S}s."
else
    log "Did not recover within ${RECOVERY_TIMEOUT}s — recording as failed recovery."
    RECOVERY_TIME_S="null"
fi

# ───────────────────────── Step 6 — submit to backend ─────────────────────────

to_json_num() {
    local v="$1"
    if [ -z "$v" ] || [ "$v" = "null" ]; then echo "0"; else echo "$v"; fi
}

PAYLOAD=$(cat <<EOF
{
  "vpn": "${VPN_LABEL}",
  "token": "${BENCHMARK_TOKEN}",
  "latency_min": $(to_json_num "$LATENCY_MIN"),
  "latency_avg": $(to_json_num "$LATENCY_AVG"),
  "latency_max": $(to_json_num "$LATENCY_MAX"),
  "throughput_upload": $(to_json_num "$THROUGHPUT_UPLOAD_MBPS"),
  "throughput_download": $(to_json_num "$THROUGHPUT_DOWNLOAD_MBPS"),
  "packet_loss": $(to_json_num "$PACKET_LOSS"),
  "cpu_avg": $(to_json_num "$CPU_AVG"),
  "cpu_peak": $(to_json_num "$CPU_PEAK"),
  "mem_avg_mb": $(to_json_num "$MEM_AVG_MB"),
  "mem_peak_mb": $(to_json_num "$MEM_PEAK_MB"),
  "connection_time_s": $(to_json_num "$CONNECTION_TIME_S"),
  "recovery_time_s": $(to_json_num "$RECOVERY_TIME_S"),
  "runs_successful": 1,
  "runs_failed": 0
}
EOF
)

log "Payload: ${PAYLOAD}"
log "Posting result to ${API_RESULTS_ENDPOINT}..."
RESPONSE=$(curl -sS -X POST "$API_RESULTS_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

log "Backend response: ${RESPONSE}"
if command -v jq &>/dev/null; then
    RESULT_ID=$(echo "$RESPONSE" | jq -r '.data.id // empty')
else
    RESULT_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2)
fi
echo "$RESULT_ID"