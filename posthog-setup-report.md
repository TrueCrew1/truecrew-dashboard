# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the True Crew dashboard. Changes include: improved client-side initialization with a reverse proxy (dev + production), seven new instrumented events spanning client and server, a shared `capturePostHogException` helper wired alongside the existing Sentry setup, and a `posthog-node` server-side helper for Vercel API functions. No existing code was removed or restructured.

| Event name | Description | File |
|---|---|---|
| `task_stage_changed` | Operator changes a task's workflow stage via the stage select dropdown | `src/components/ui/index.tsx` |
| `chief_approval_decided` | Operator makes an approve, reject, or send-back decision on a Chief proposal | `src/components/chief/ChiefApprovalsContext.tsx` |
| `chief_command_submitted` | Operator submits a command to the Chief AI assistant from the home panel | `src/components/chief/ChiefHomePanel.tsx` |
| `build_agent_test_proposed` | Operator proposes a Build Agent test change for approval review | `src/pages/BuildsPage.tsx` |
| `today_work_orders_retry` | Operator triggers a manual retry after work orders fail to load | `src/pages/TodayPage.tsx` |
| `server_task_stage_changed` | Server confirms a task stage update was successfully persisted to the database | `api/tasks/[id].ts` |
| `server_approval_decision_recorded` | Server confirms a Chief approval decision was successfully persisted to the database | `api/chief/approvals/index.ts` |

Other changes made:
- **`src/lib/analytics/posthog.ts`** — Added `defaults: '2026-01-30'`, proxy path (`api_host: '/ingest'`), `__add_tracing_headers` for client↔server session correlation, and new exports `captureEvent` and `capturePostHogException`.
- **`vite.config.ts`** — Added `/ingest` reverse proxy routes for local development.
- **`vercel.json`** — Added `/ingest/*` rewrites for ad-blocker avoidance in production.
- **`lib/posthog/server.ts`** — New PostHog Node.js helper (`createPostHogClient`, `getPostHogContext`) for short-lived Vercel serverless functions.
- **`src/hooks/useTodayWorkOrders.ts`** — Added `capturePostHogException` alongside existing Sentry error capture.

## Next steps

We've built a dashboard and five insights to track operator behavior and platform health:

- [Analytics basics (wizard)](https://us.posthog.com/project/498009/dashboard/1814767) — main dashboard
- [Task stage changes over time](https://us.posthog.com/project/498009/insights/gimzUrIE)
- [Chief approval decisions](https://us.posthog.com/project/498009/insights/qW6VbDqI)
- [Chief commands submitted (30d)](https://us.posthog.com/project/498009/insights/2pYFQdR8)
- [Work orders dashboard: loaded vs errors](https://us.posthog.com/project/498009/insights/wDHnAOfM)
- [Operator engagement: approvals vs commands](https://us.posthog.com/project/498009/insights/a0Y5D84L)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_POSTHOG_API_KEY` and `VITE_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-react-router-7-framework/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
