#!/usr/bin/env bash
# switch.sh  <wireguard|headscale>
# Brings down the current VPN and brings up the requested one.
# Prints the connection time in seconds on stdout.

set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 <wireguard|headscale>" >&2
  exit 1
fi

# ── config ────────────────────────────────────────────────────────────────────
WG_INTERFACE="wg0"                   # wg-quick interface name
HS_INTERFACE="tailscale0"            # Headscale / Tailscale interface
PING_HOST="10.0.0.1"                 # a peer on the VPN to confirm tunnel is up
TIMEOUT=30                           # seconds to wait for tunnel

# ── helpers ───────────────────────────────────────────────────────────────────
log()  { echo "[switch] $*" >&2; }
die()  { echo "[switch] ERROR: $*" >&2; exit 1; }

wait_for_ping() {
  local host="$1"
  local deadline=$(( $(date +%s) + TIMEOUT ))
  while (( $(date +%s) < deadline )); do
    if ping -c1 -W1 "$host" &>/dev/null; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

# ── tear down whatever is running ─────────────────────────────────────────────
log "Tearing down existing VPN connections..."
wg-quick down "$WG_INTERFACE" 2>/dev/null || true
tailscale down           2>/dev/null || true
sleep 1

# ── bring up the requested VPN and measure connection time ────────────────────
START_NS=$(date +%s%N)

case "$TARGET" in
  wireguard)
    log "Bringing up WireGuard ($WG_INTERFACE)..."
    wg-quick up "$WG_INTERFACE"
    ;;
  headscale)
    log "Bringing up Headscale (tailscale up)..."
    tailscale up --login-server "${HEADSCALE_URL:-http://headscale:8080}"
    ;;
  *)
    die "Unknown VPN: $TARGET. Must be 'wireguard' or 'headscale'."
    ;;
esac

# ── wait until the tunnel is actually reachable ───────────────────────────────
log "Waiting for ping to $PING_HOST..."
if ! wait_for_ping "$PING_HOST"; then
  die "Tunnel came up but $PING_HOST is unreachable after ${TIMEOUT}s"
fi

END_NS=$(date +%s%N)
CONN_TIME_S=$(echo "scale=3; ($END_NS - $START_NS) / 1000000000" | bc)

log "$TARGET ready in ${CONN_TIME_S}s"
echo "$CONN_TIME_S"    # caller reads this
