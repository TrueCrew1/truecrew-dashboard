#!/usr/bin/env bash
set -u

LOG_FILE="${QA_LOG_FILE:-.qa/nightly-qa-full.log}"
INTERVAL_SECONDS="${QA_INTERVAL_SECONDS:-1200}"
MODE="${QA_MODE:-qa}"

mkdir -p .qa

run_command() {
  if [ "$MODE" = "build" ]; then
    npm run build
  else
    npm run qa
  fi
}

echo "Nightly QA loop started (mode=${MODE}, interval=${INTERVAL_SECONDS}s, log=${LOG_FILE})"

while true; do
  echo "=== QA_LOOP_START $(date -u +%Y-%m-%dT%H:%M:%SZ) mode=${MODE} ===" >> "$LOG_FILE"
  run_command >> "$LOG_FILE" 2>&1
  code=$?

  if [ "$code" -ne 0 ]; then
    echo "QA_LOOP_FAILURE exit_code=${code} at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG_FILE"
  fi

  echo "=== QA_LOOP_END code=${code} ===" >> "$LOG_FILE"
  sleep "$INTERVAL_SECONDS"
done
