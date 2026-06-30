#!/usr/bin/env bash
#
# True Crew — Integration setup
#
# Idempotent. Safe to run multiple times.
#
#   - Backs up existing .env.local before touching it
#   - Appends keys from .env.example that aren't already in .env.local
#   - Preserves any existing values (e.g. VERCEL_OIDC_TOKEN)
#   - Auto-generates GITHUB_WEBHOOK_SECRET when it's still the placeholder
#   - Ensures scripts/deploy-vercel.sh is executable
#
# Usage (from repo root):
#   chmod +x "True Crew/Implementation-Code/scripts-setup-integrations.sh"
#   ./True\ Crew/Implementation-Code/scripts-setup-integrations.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

ENV_LOCAL=".env.local"
EXAMPLE=".env.example"

echo "True Crew — integration setup"
echo "============================="
echo "Repo: $ROOT"
echo ""

if [ ! -f package.json ]; then
  echo "✗ package.json not found in $ROOT — are you in the right repo?"
  exit 1
fi

if [ ! -f "$EXAMPLE" ]; then
  echo "✗ $EXAMPLE not found — cannot bootstrap $ENV_LOCAL"
  exit 1
fi

if [ -f "$ENV_LOCAL" ]; then
  BACKUP="${ENV_LOCAL}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$ENV_LOCAL" "$BACKUP"
  echo "✓ Backed up existing $ENV_LOCAL → $BACKUP"
else
  touch "$ENV_LOCAL"
  echo "✓ Created empty $ENV_LOCAL"
fi

added=0
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|\#*) continue ;;
  esac
  key="${line%%=*}"
  [ -z "$key" ] && continue
  if grep -qE "^${key}=" "$ENV_LOCAL"; then
    continue
  fi
  printf '%s\n' "$line" >> "$ENV_LOCAL"
  echo "  + added $key (placeholder from $EXAMPLE)"
  added=$((added + 1))
done < "$EXAMPLE"

if [ "$added" -eq 0 ]; then
  echo "✓ $ENV_LOCAL already contains every key from $EXAMPLE"
else
  echo "✓ Appended $added missing key(s) to $ENV_LOCAL"
fi

get_value() {
  grep -E "^$1=" "$ENV_LOCAL" | tail -n1 | sed -E "s/^$1=//; s/^\"(.*)\"$/\1/"
}

current_webhook="$(get_value GITHUB_WEBHOOK_SECRET || true)"
if [ -z "$current_webhook" ] || [ "$current_webhook" = "your-github-webhook-secret" ]; then
  if command -v openssl >/dev/null 2>&1; then
    new_secret="$(openssl rand -hex 32)"
    tmp="$(mktemp)"
    awk -v k="GITHUB_WEBHOOK_SECRET" -v v="$new_secret" '
      BEGIN { found = 0 }
      {
        if (index($0, k "=") == 1) { print k "=" v; found = 1 }
        else { print }
      }
      END {
        if (!found) print k "=" v
      }
    ' "$ENV_LOCAL" > "$tmp"
    mv "$tmp" "$ENV_LOCAL"
    echo "✓ Generated GITHUB_WEBHOOK_SECRET (openssl rand -hex 32)"
  else
    echo "⚠ openssl not found — leave GITHUB_WEBHOOK_SECRET as a placeholder and set it manually"
  fi
else
  echo "✓ GITHUB_WEBHOOK_SECRET already customised — leaving alone"
fi

if [ -f scripts/deploy-vercel.sh ]; then
  chmod +x scripts/deploy-vercel.sh
  echo "✓ scripts/deploy-vercel.sh is executable"
fi

echo ""
echo "Next steps:"
echo "  1. Edit $ENV_LOCAL and fill in real values for:"
echo "       SUPABASE_URL"
echo "       SUPABASE_SERVICE_ROLE_KEY"
echo "       VITE_SUPABASE_URL"
echo "       VITE_SUPABASE_ANON_KEY"
echo "       OBSIDIAN_VAULT_PATH      # local dev only"
echo "     (GITHUB_WEBHOOK_SECRET is generated; copy it into the GitHub webhook config.)"
echo ""
echo "  2. Install deps + verify build:"
echo "       npm install"
echo "       npm run build"
echo ""
echo "  3. Push env vars to Vercel (one at a time — 'vercel env add' does NOT accept stdin):"
echo "       npx vercel link                 # if not already linked"
echo "       npx vercel env add SUPABASE_URL production"
echo "       npx vercel env add SUPABASE_SERVICE_ROLE_KEY production"
echo "       npx vercel env add GITHUB_WEBHOOK_SECRET production"
echo "       npx vercel env add VITE_SUPABASE_URL production"
echo "       npx vercel env add VITE_SUPABASE_ANON_KEY production"
echo "       npx vercel env add VITE_USE_LIVE_API production"
echo "     (Or paste them into the Vercel dashboard → Project → Settings → Environment Variables.)"
echo ""
echo "  4. Deploy:"
echo "       npx vercel deploy --prod"
echo ""
echo "  5. Verify the health endpoint:"
echo "       curl https://<your-domain>/api/health"
echo ""
echo "Full step-by-step list lives in: True Crew/TERMINAL-COMMANDS.txt"
