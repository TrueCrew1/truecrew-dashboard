#!/usr/bin/env bash
# Push LLM + internal-auth vars from .env.local to Vercel (Production + Preview).
# Requires: vercel login (or VERCEL_TOKEN) and project linked (`vercel link`).
# Does not print secret values.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.example and fill values first." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

KEYS=(
  AZURE_OPENAI_API_KEY
  AZURE_OPENAI_ENDPOINT
  AZURE_AI_RESOURCE_ENDPOINT
  AZURE_OPENAI_DEPLOYMENT
  INTERNAL_API_SECRET
  VITE_INTERNAL_KEY
)

push_env() {
  local target="$1" # production | preview
  for key in "${KEYS[@]}"; do
    value="${!key:-}"
    if [[ -z "$value" ]]; then
      echo "Skip $key ($target): not set in .env.local" >&2
      continue
    fi
    echo "Setting $key for $target..."
    printf '%s' "$value" | npx vercel env rm "$key" "$target" --yes 2>/dev/null || true
    printf '%s' "$value" | npx vercel env add "$key" "$target"
  done
}

push_env production
push_env preview

echo "Done. Redeploy Production to pick up new env: npx vercel deploy --prod"
