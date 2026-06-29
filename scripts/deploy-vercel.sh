#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "True Crew — Vercel + Supabase setup check"
echo "=========================================="
echo ""

check() {
  if [ -n "${!1:-}" ]; then
    echo "✓ $1 is set"
  else
    echo "✗ $1 is missing"
    MISSING=1
  fi
}

MISSING=0
check VERCEL_TOKEN
check SUPABASE_URL
check SUPABASE_SERVICE_ROLE_KEY

if [ -n "${SUPABASE_URL:-}" ]; then
  ref="${SUPABASE_URL#https://}"
  ref="${ref%%.*}"
  echo "  → SUPABASE_PROJECT_REF (GitHub Actions): $ref"
fi

echo ""
if [ "${MISSING:-0}" -eq 1 ]; then
  echo "Add missing vars, then run:"
  echo "  npx vercel --prod"
  echo ""
  echo "See docs/DEPLOY_NOW.md for full setup."
  exit 1
fi

echo "Building..."
npm ci
npm run build

echo "Deploying to Vercel..."
npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"

echo ""
echo "Done. Verify:"
echo "  curl https://YOUR_DOMAIN/api/health"
