#!/bin/bash

START_URL="https://backend.vpn.samay15jan.com/api/benchmark/start"
STATUS_URL="https://backend.vpn.samay15jan.com/results"

EMAIL="zeus15jan@gmail.com"
TOTAL_RUNS=82
POLL_INTERVAL=5

for ((i=1; i<=TOTAL_RUNS; i++)); do
    echo
    echo "======================================="
    echo "Benchmark $i/$TOTAL_RUNS"
    echo "======================================="

    RESPONSE=$(curl -s \
        -X POST "$START_URL" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\"}")

    TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')

    if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
        echo "Failed to start benchmark."
        echo "$RESPONSE"
        exit 1
    fi

    echo "Token: $TOKEN"
    echo "Waiting for completion..."

    while true; do
        STATUS=$(curl -s "$STATUS_URL/$TOKEN" | jq -r '.data.status')

        case "$STATUS" in
            completed)
                echo "✅ Benchmark completed."
                break
                ;;
            failed)
                echo "❌ Benchmark failed."
                exit 1
                ;;
            pending|running)
                echo "⏳ Status: $STATUS"
                sleep "$POLL_INTERVAL"
                ;;
            *)
                echo "⚠️ Unknown status: $STATUS"
                sleep "$POLL_INTERVAL"
                ;;
        esac
    done

    echo "Waiting 5 seconds before next benchmark..."
    sleep 5
done

echo
echo "======================================="
echo "All $TOTAL_RUNS benchmarks completed."
echo "======================================="
