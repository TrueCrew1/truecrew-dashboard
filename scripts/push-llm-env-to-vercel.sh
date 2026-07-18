#!/usr/bin/env bash
# Push LLM + internal-auth env vars to Vercel Production.
# Requires: vercel login (or VERCEL_TOKEN), vercel link, and .env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env.local ]; then
  echo "Missing .env.local — copy from .env.example first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

for key in AZURE_OPENAI_API_KEY AZURE_OPENAI_ENDPOINT AZURE_AI_RESOURCE_ENDPOINT INTERNAL_API_SECRET VITE_INTERNAL_KEY; do
  if [ -z "${!key:-}" ]; then
    echo "Missing $key in .env.local"
    exit 1
  fi
done

TOKEN_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  TOKEN_ARGS=(--token="$VERCEL_TOKEN")
fi

upsert() {
  local key="$1"
  local value="$2"
  vercel env rm "$key" production --yes "${TOKEN_ARGS[@]}" 2>/dev/null || true
  printf '%s' "$value" | vercel env add "$key" production "${TOKEN_ARGS[@]}"
  echo "Synced $key to Vercel Production"
}

upsert AZURE_OPENAI_API_KEY "$AZURE_OPENAI_API_KEY"
upsert AZURE_OPENAI_ENDPOINT "$AZURE_OPENAI_ENDPOINT"
upsert AZURE_AI_RESOURCE_ENDPOINT "$AZURE_AI_RESOURCE_ENDPOINT"
upsert INTERNAL_API_SECRET "$INTERNAL_API_SECRET"
upsert VITE_INTERNAL_KEY "$VITE_INTERNAL_KEY"

echo "Done. Redeploy production for changes to take effect."
