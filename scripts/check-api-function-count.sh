#!/usr/bin/env bash
# Fail when deployable /api handlers exceed the Vercel Hobby Serverless Function cap.
# Vercel counts each api/**/*.{ts,js} file as one Serverless Function on this Vite layout.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAX="${VERCEL_HOBBY_FUNCTION_LIMIT:-12}"
API_DIR="$ROOT/api"

if [[ ! -d "$API_DIR" ]]; then
  echo "check-api-function-count: api/ directory not found at $API_DIR" >&2
  exit 1
fi

mapfile -t FILES < <(find "$API_DIR" -type f \( -name '*.ts' -o -name '*.js' \) | sort)
COUNT="${#FILES[@]}"

echo "Vercel Hobby function count: $COUNT / $MAX (files under api/**/*.{ts,js})"
printf '%s\n' "${FILES[@]#"$ROOT"/}"

if (( COUNT > MAX )); then
  echo >&2
  echo "ERROR: $COUNT deployable /api handlers exceeds Hobby cap of $MAX." >&2
  echo "Consolidate into an existing dispatch handler + vercel.json rewrite," >&2
  echo "or upgrade off Hobby. Do not add a new top-level api/*.ts file casually." >&2
  exit 1
fi
