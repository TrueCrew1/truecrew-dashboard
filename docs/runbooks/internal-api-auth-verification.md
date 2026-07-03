# Internal API auth — verification runbook

## Purpose

Verify the internal API auth guard (`requireInternalAuth` in `lib/auth.ts`) is
correctly configured in a given environment, and troubleshoot unexpected 401s
on `/api/health`, `/api/data`, and the other guarded routes.

For full setup steps, see [VERCEL_SUPABASE_SETUP.md](../VERCEL_SUPABASE_SETUP.md).
This runbook is for on-demand verification, not initial setup.

## Required env vars

| Var | Scope | Notes |
|---|---|---|
| `INTERNAL_API_SECRET` | Server only | Read by `lib/auth.ts`. Never exposed to the client. |
| `VITE_INTERNAL_KEY` | Client (bundled) | Sent as the `x-internal-key` header by `src/lib/api/client.ts`. Must match `INTERNAL_API_SECRET` exactly. |

## Where they belong in Vercel

Project → **Settings → Environment Variables** → set both vars, same value,
on **Production** (and **Preview** if you test there too).

## Why `VITE_INTERNAL_KEY` needs a fresh Production build

Vite inlines `VITE_*` vars into the client bundle **at build time**, not at
request time. Saving a new value in the Vercel dashboard does not change
already-built bundles — a new Production deployment must run after the value
is set or changed, or the old (or missing) value stays live.

## Safe curl checks (placeholders only — never paste a real secret value)

```bash
# No header — expect 401 (fail-closed by design, not a bug)
curl -i https://YOUR_VERCEL_DOMAIN/api/health

# With header — expect 200
curl -i -H "x-internal-key: <VITE_INTERNAL_KEY value>" https://YOUR_VERCEL_DOMAIN/api/health
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `401 Unauthorized` | No `x-internal-key` header sent, or the value is wrong — this is expected without the header. Re-run with the header per the curl example above. |
| Changed the env var but old behavior persists | Vite bakes `VITE_INTERNAL_KEY` into the bundle at build time. Saving the value alone doesn't take effect — trigger a fresh Production deployment, then re-test. |
| Mismatch between `INTERNAL_API_SECRET` and `VITE_INTERNAL_KEY` | Compare both values in Vercel → Settings → Environment Variables character-for-character per environment. If unsure, regenerate one value and set both vars to match, then redeploy. |
