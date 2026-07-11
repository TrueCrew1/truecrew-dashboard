# Observability — PostHog + Sentry

End-to-end setup for Today dashboard analytics and error tracking. Code is already wired;
this doc covers external accounts, Vercel env vars, and verification.

## What the code does

| Layer | Library | Env vars | Active when |
|-------|---------|----------|-------------|
| PostHog (client) | `posthog-js` | `VITE_POSTHOG_API_KEY`, `VITE_POSTHOG_HOST` | Production build only (`import.meta.env.PROD`), not test/vitest, both vars set |
| Sentry (client) | `@sentry/react` | `VITE_SENTRY_DSN` | Production build only, not test/vitest, DSN set |
| Sentry (API) | `@sentry/node` | `SENTRY_DSN` | `NODE_ENV=production` (Vercel serverless), not test/vitest, DSN set |

**Not observability env vars** (already required for Today, reused for tagging):

- `TODAY_ORG_ID` — Sentry API errors and PostHog events include `org_id` from the read model or this server config

**Disabled by design:**

- `npm run dev` — no PostHog events, no Sentry reports (client guards on `PROD`)
- `npm test` / vitest — same
- Missing DSN or PostHog vars — silent no-op, app works normally

**Code paths:**

- `src/lib/analytics/posthog.ts` — init + `captureTodayEvent()`
- `src/lib/sentry/client.ts` — init, Today route context, `captureTodayClientError()`
- `lib/sentry/server.ts` — `captureTodayApiError()` on Today API 500s
- `src/main.tsx` — calls `initPostHog()` and `initClientSentry()` at startup
- `src/hooks/useTodayWorkOrders.ts` — fires three PostHog events + Sentry on load error
- `src/pages/TodayPage.tsx` — sets/clears Sentry `today_route` context while mounted
- `api/today/work-orders.ts` — reports build failures to Sentry

## PostHog events (Today page)

| Event | When | Properties |
|-------|------|------------|
| `today_dashboard_loaded` | Work orders load succeeds (ready or empty) | `board_state`, `is_live_api`, `org_id` |
| `today_dashboard_empty_state` | Board is empty | `is_live_api`, `org_id` |
| `today_dashboard_error` | Work orders load fails | `error_message`, `is_live_api` |

---

## Step 1 — PostHog project

1. Sign in at [posthog.com](https://posthog.com) → create or open a project.
2. **Project settings → Project API key** — copy the key (starts with `phc_`).
3. **Project settings → Host** (or **Settings → Data pipelines → Custom domains**):
   - US cloud: `https://us.i.posthog.com`
   - EU cloud: `https://eu.i.posthog.com`
4. Save both values — you need **key and host**; the app does not default the host.

---

## Step 2 — Sentry project

1. Sign in at [sentry.io](https://sentry.io) → **Create project**.
2. Platform: **React** (covers the Vite SPA; Node errors use the same DSN for minimal setup).
3. Copy the **DSN** (`https://…@….ingest….sentry.io/…`).
4. One DSN is enough for this pass — use the same value for client and server env vars below.
   (Optional later: split into separate React and Node projects with two DSNs.)

---

## Step 3 — Vercel environment variables

Vercel project → **Settings → Environment Variables**.

Add all four for **Preview** and **Production** (not required for local dev):

| Name | Value | Notes |
|------|-------|-------|
| `VITE_POSTHOG_API_KEY` | `phc_…` | Bundled into client; safe to expose (project key, not personal secret) |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` (or EU host) | Required with key |
| `VITE_SENTRY_DSN` | Sentry DSN | Bundled into client |
| `SENTRY_DSN` | Same DSN (or Node-specific) | Server-only; Today API route |

Ensure these are already set for Today to work (observability reuses org context):

| Name | Notes |
|------|-------|
| `TODAY_ORG_ID` | Appears as `org_id` on Sentry API errors and PostHog events |
| `TODAY_ORG_NAME` | Required for Today API |
| `VITE_USE_LIVE_API` | `true` on preview/prod if you want live work-order reads (needed to exercise error paths against the API) |

**Redeploy** after adding or changing env vars (Vite inlines `VITE_*` at build time).

---

## Step 4 — Verify PostHog

Use a **Preview** or **Production** deployment (not `npm run dev`).

1. Open PostHog → **Activity** or **Live events**.
2. Visit your deploy → **Today** page (`/`).
3. Within ~30s, confirm:
   - `today_dashboard_loaded` with `org_id` and `board_state` (`ready` or `empty`)
   - If the org has no work orders: also `today_dashboard_empty_state`
4. Optional error event: set `VITE_USE_LIVE_API=true` but break API auth (wrong `VITE_INTERNAL_KEY`) → reload Today → `today_dashboard_error` with `error_message`.

**Filter tip:** search events by exact name `today_dashboard_loaded`.

---

## Step 5 — Verify Sentry (frontend)

Preview or Production only.

1. Open Today in the browser.
2. DevTools console:
   ```js
   throw new Error("truecrew sentry frontend verification");
   ```
3. Sentry → **Issues** — new error within a minute.
4. Confirm:
   - Tag `route: today_work_orders` on the captured exception
   - Context `today_route` while on the page (before navigation away)

**Load-error path:** with live API misconfigured, Today shows the error panel — Sentry should also receive an issue from `captureTodayClientError` with tag `route: today_work_orders`.

---

## Step 6 — Verify Sentry (Today API)

Preview or Production with Supabase configured.

Force a 500 on the Today API (e.g. temporarily break `buildRealTodayWorkOrdersResponse` in a preview branch, or use a deploy where Supabase throws).

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "x-internal-key: YOUR_INTERNAL_API_SECRET" \
  "https://YOUR_DEPLOY.vercel.app/api/today/work-orders"
```

Expect `500`. In Sentry → **Issues**:

- Tag `route: today_work_orders`
- Tag `org_id: <TODAY_ORG_ID>`

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| No PostHog events on preview | Vars missing at **build** time — redeploy after setting `VITE_POSTHOG_*` |
| No PostHog events locally | Expected — PostHog is `PROD`-only |
| No Sentry in dev | Expected — client requires production build |
| PostHog key set but no events | `VITE_POSTHOG_HOST` missing or wrong region host |
| Sentry API silent | `SENTRY_DSN` not set on server env, or error is 403/401 (not captured) — only 500s in `work-orders` handler call `captureTodayApiError` |
| Events in preview but not prod | Check Production env scope in Vercel and redeploy production |

---

## Local `.env` (optional)

Copy from `.env.example`. Observability vars only take effect in a **production build**:

```bash
npm run build && npm run preview
```

Use sparingly — events will hit real PostHog/Sentry projects. Prefer preview deploys for verification.
