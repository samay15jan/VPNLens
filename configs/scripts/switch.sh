#!/usr/bin/env bash
#
# switch.sh — deterministic VPN switcher for the benchmark node (Server 2)
#
# Usage:
#   ./switch.sh wireguard
#   ./switch.sh tailscale
#
# Design (agreed methodology):
#   Phase 0  Normalize  — stop BOTH vpns unconditionally, every run, no branching
#                         on assumed prior state. State is never trusted from a
#                         file; it is always read live from the system.
#   Phase 1  Verify clean — confirm both interfaces are truly gone before
#                         bringing anything up.
#   Phase 2  Bring up    — start ONLY the requested vpn.
#   Phase 3  Verify usable — layered, fail-fast checks:
#                         interface exists -> ip assigned -> route exists ->
#                         ping -> backend health check over the tunnel.
#   On failure: retry bring-up up to MAX_ATTEMPTS times, same verification
#               gate each time. No automatic rollback — a failed switch is
#               reported and the run is marked invalid; the benchmark runner
#               decides what to do next.
#   Output: a single JSON object on stdout. Everything else (logs, progress)
#               goes to stderr, so stdout stays machine-parseable.
#
# Tailscale stays registered with headscale at all times (no re-auth per
# switch) — only `tailscale up` / `tailscale down` toggle the active tunnel.
#
set -u
set -o pipefail

# ───────────────────────── CONFIG — fill these in for your environment ─────────────────────────

WG_INTERFACE="wg0"
WG_CONFIG_PATH="/etc/wireguard/${WG_INTERFACE}.conf"

# Server 1's address on each VPN's internal subnet. Get these from `wg show` /
# wg-easy's UI (WireGuard) and `tailscale status` (Tailscale) respectively.
SERVER1_WG_IP="10.8.0.1"
SERVER1_TS_IP="100.64.0.1"          # <-- replace with Server 1's real tailnet IP

# Headscale login server — only used if tailscale ever needs re-registration.
# Normal switches do NOT re-authenticate; this is kept only as a reference.
HEADSCALE_LOGIN_SERVER="https://hs.vpn.samay15jan.com"

# Backend health endpoint, reachable over EITHER tunnel once it's up.
# This is the last and most important check — ICMP can succeed while the
# actual application path is broken.
BACKEND_HEALTH_URL="https://backend.vpn.samay15jan.com/health"   # <-- replace host:port/path with your real backend health route reachable over the WG/TS subnet

# Polling / timeout strategy. Poll frequently, cap total wait per phase.
POLL_INTERVAL_SEC=1
TEARDOWN_TIMEOUT_SEC=10      # max time to wait for an interface to fully disappear
BRINGUP_TIMEOUT_SEC=15       # max time to wait for the verification ladder to pass
OVERALL_TIMEOUT_SEC=45       # hard ceiling for the whole switch, across all attempts

MAX_ATTEMPTS=3               # bring-up attempts before giving up (no rollback)

# ───────────────────────────────────────────────────────────────────────────────────────────────

SCRIPT_START_EPOCH=$(date +%s)
TARGET_VPN="${1:-}"
ATTEMPT=0

# Per-phase timing, captured for the final JSON report.
declare -A PHASE_DURATIONS
PHASE_DURATIONS=()

log() {
    # All human-readable logging goes to stderr. stdout is reserved for the
    # final JSON result only.
    echo "[switch.sh] $*" >&2
}

now_epoch() { date +%s; }

elapsed_since() {
    local start="$1"
    echo $(( $(now_epoch) - start ))
}

overall_timeout_exceeded() {
    [ "$(elapsed_since "$SCRIPT_START_EPOCH")" -ge "$OVERALL_TIMEOUT_SEC" ]
}

# json_escape: minimal escaping for safe embedding of dynamic strings in JSON.
json_escape() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    echo "$s"
}

emit_result() {
    # emit_result <success:true|false> <attempts> <assigned_ip> <failed_phase> <reason>
    local success="$1" attempts="$2" assigned_ip="$3" failed_phase="$4" reason="$5"
    local total_duration
    total_duration=$(elapsed_since "$SCRIPT_START_EPOCH")

    local phases_json="{"
    local first=1
    for phase in "${!PHASE_DURATIONS[@]}"; do
        [ "$first" -eq 0 ] && phases_json+=","
        phases_json+="\"$(json_escape "$phase")\": ${PHASE_DURATIONS[$phase]}"
        first=0
    done
    phases_json+="}"

    cat <<EOF
{
  "vpn": "$(json_escape "$TARGET_VPN")",
  "success": ${success},
  "attempts": ${attempts},
  "assigned_ip": "$(json_escape "$assigned_ip")",
  "total_duration_sec": ${total_duration},
  "phase_durations_sec": ${phases_json},
  "failed_phase": "$(json_escape "$failed_phase")",
  "reason": "$(json_escape "$reason")",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

fail_and_exit() {
    local failed_phase="$1" reason="$2"
    log "FAILED at phase '${failed_phase}': ${reason}"
    emit_result "false" "$ATTEMPT" "" "$failed_phase" "$reason"
    exit 1
}

# ───────────────────────────── Phase 0 — Normalize (stop both) ─────────────────────────────

stop_wireguard() {
    if ip link show "$WG_INTERFACE" &>/dev/null; then
        log "Stopping WireGuard (${WG_INTERFACE})..."
        wg-quick down "$WG_INTERFACE" &>/dev/null || true
    fi
}

stop_tailscale() {
    log "Stopping Tailscale..."
    sudo tailscale down &>/dev/null || true
}

phase_normalize() {
    local t0; t0=$(now_epoch)
    log "Phase 0: stopping both VPNs unconditionally..."
    stop_wireguard
    stop_tailscale
    PHASE_DURATIONS["normalize"]=$(elapsed_since "$t0")
}

# ───────────────────────────── Phase 1 — Verify clean ─────────────────────────────

wireguard_is_down() {
    ! ip link show "$WG_INTERFACE" &>/dev/null
}

tailscale_is_down() {
    # `tailscale status` exits non-zero / reports stopped when the backend is down.
    local state
    state=$(sudo tailscale status --json 2>/dev/null | grep -o '"BackendState":"[A-Za-z]*"' | cut -d'"' -f4)
    [ "$state" != "Running" ]
}

phase_verify_clean() {
    local t0; t0=$(now_epoch)
    log "Phase 1: verifying both VPNs are fully down..."
    local waited=0
    while true; do
        if wireguard_is_down && tailscale_is_down; then
            PHASE_DURATIONS["verify_clean"]=$(elapsed_since "$t0")
            log "Clean state confirmed."
            return 0
        fi
        if [ "$waited" -ge "$TEARDOWN_TIMEOUT_SEC" ] || overall_timeout_exceeded; then
            PHASE_DURATIONS["verify_clean"]=$(elapsed_since "$t0")
            fail_and_exit "verify_clean" "Interfaces did not fully tear down within ${TEARDOWN_TIMEOUT_SEC}s"
        fi
        sleep "$POLL_INTERVAL_SEC"
        waited=$(( waited + POLL_INTERVAL_SEC ))
    done
}

# ───────────────────────────── Phase 2 — Bring up target ─────────────────────────────

bring_up_wireguard() {
    log "Bringing up WireGuard (${WG_INTERFACE})..."
    wg-quick up "$WG_INTERFACE" &>/dev/null
}

bring_up_tailscale() {
    log "Bringing up Tailscale (no re-auth, already registered)..."
    sudo tailscale up --accept-dns=false --login-server="$HEADSCALE_LOGIN_SERVER" &>/dev/null
}

phase_bring_up() {
    local t0; t0=$(now_epoch)
    case "$TARGET_VPN" in
        wireguard) bring_up_wireguard ;;
        tailscale) bring_up_tailscale ;;
    esac
    PHASE_DURATIONS["bring_up"]=$(elapsed_since "$t0")
}

# ───────────────────────────── Phase 3 — Verify usable (layered, fail-fast) ─────────────────────────────

check_interface_exists() {
    case "$TARGET_VPN" in
        wireguard) ip link show "$WG_INTERFACE" &>/dev/null ;;
        tailscale) ip link show tailscale0 &>/dev/null ;;
    esac
}

get_assigned_ip() {
    case "$TARGET_VPN" in
        wireguard) ip -4 addr show "$WG_INTERFACE" 2>/dev/null | grep -oP 'inet \K[\d.]+' ;;
        tailscale) tailscale ip -4 2>/dev/null ;;
    esac
}

check_ip_assigned() {
    [ -n "$(get_assigned_ip)" ]
}

check_route_exists() {
    local target_ip
    case "$TARGET_VPN" in
	wireguard) target_ip="$SERVER1_WG_IP" ;;
	tailscale) target_ip="$SERVER1_TS_IP" ;;
    esac
    ip route get "$target_ip" &>/dev/null
}

check_ping() {
    local target_ip
    case "$TARGET_VPN" in
        wireguard) target_ip="$SERVER1_WG_IP" ;;
        tailscale) target_ip="$SERVER1_TS_IP" ;;
    esac
    ping -c 2 -W 2 "$target_ip" &>/dev/null
}

check_backend_reachable() {
    curl -sS -o /dev/null -w "%{http_code}" --max-time 5 "$BACKEND_HEALTH_URL" 2>/dev/null | grep -qE '^(200|204)$'
}

# Runs the full ladder once. Returns 0 only if every step passes, in order.
# Echoes the name of the first failed check on failure (for reporting).
run_verification_ladder() {
    if ! check_interface_exists; then echo "interface_exists"; return 1; fi
    if ! check_ip_assigned;     then echo "ip_assigned";     return 1; fi
    if ! check_route_exists;    then echo "route_exists";    return 1; fi
    if ! check_ping;            then echo "ping";            return 1; fi
    if ! check_backend_reachable; then echo "backend_health"; return 1; fi
    return 0
}

phase_verify_usable() {
    local t0; t0=$(now_epoch)
    log "Phase 3: running verification ladder for ${TARGET_VPN}..."
    local waited=0
    local last_failed_check=""
    while true; do
        last_failed_check=$(run_verification_ladder)
        if [ -z "$last_failed_check" ]; then
            PHASE_DURATIONS["verify_usable"]=$(elapsed_since "$t0")
            log "Verification passed: ${TARGET_VPN} is usable."
            return 0
        fi
        if [ "$waited" -ge "$BRINGUP_TIMEOUT_SEC" ] || overall_timeout_exceeded; then
            PHASE_DURATIONS["verify_usable"]=$(elapsed_since "$t0")
            echo "$last_failed_check"   # signal which check failed, to caller
            return 1
        fi
        sleep "$POLL_INTERVAL_SEC"
        waited=$(( waited + POLL_INTERVAL_SEC ))
    done
}

# ───────────────────────────────────────── Main ─────────────────────────────────────────

main() {
    if [ "$TARGET_VPN" != "wireguard" ] && [ "$TARGET_VPN" != "tailscale" ]; then
        log "Usage: $0 <wireguard|tailscale>"
        emit_result "false" "0" "" "argument_validation" "Invalid or missing target VPN argument"
        exit 1
    fi

    phase_normalize
    phase_verify_clean

    while [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; do
        ATTEMPT=$(( ATTEMPT + 1 ))
        log "Attempt ${ATTEMPT}/${MAX_ATTEMPTS} to bring up ${TARGET_VPN}..."

        phase_bring_up

        local failed_check
        if failed_check=$(phase_verify_usable); then
            local ip
            ip=$(get_assigned_ip)
            log "Switch to ${TARGET_VPN} succeeded on attempt ${ATTEMPT}. IP: ${ip}"
            emit_result "true" "$ATTEMPT" "$ip" "" ""
            exit 0
        fi

        log "Attempt ${ATTEMPT} failed verification at: ${failed_check}"

        if overall_timeout_exceeded; then
            fail_and_exit "$failed_check" "Overall timeout (${OVERALL_TIMEOUT_SEC}s) exceeded"
        fi

        if [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; then
            log "Retrying: tearing down and re-attempting..."
            stop_wireguard
            stop_tailscale
            sleep "$POLL_INTERVAL_SEC"
        fi
    done

    fail_and_exit "verify_usable" "Exhausted ${MAX_ATTEMPTS} attempts; last failed check: ${failed_check:-unknown}"
}

main "$@"
