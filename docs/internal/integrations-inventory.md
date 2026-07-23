# Integrations inventory (V1 product baseline)

**Source of truth:** `lib/ops/integrationsInventory.ts`  
**Env reference:** `.env.example`

This inventory lists **services the dashboard code actually references** — purpose, repo touchpoints, env dependencies, failure behavior, and V1 status.

## Status legend

| Status | Meaning |
|--------|---------|
| `active` | Required for live product paths when enabled |
| `partial` | Used with explicit scope limits or optional env |
| `not_wired` | Documented/planned only on current `main` |
| `planned` | Intentionally deferred |

## Inventory index

| id | service | status | operator |
|----|---------|--------|----------|
| `supabase` | Supabase Postgres | active | founder |
| `vercel` | Vercel hosting + deploy API | active | founder |
| `internal-api-auth` | Internal API auth | active | founder |
| `obsidian-vault` | Obsidian vault | partial | founder |
| `slack` | Slack outbound webhook | partial | operator |
| `github` | GitHub webhooks | partial | founder |
| `azure-openai` | Azure OpenAI LLM router | partial | founder |
| `ollama` | Ollama (local) | partial | operator |
| `vercel-mcp` | Vercel MCP (editor) | partial | founder |
| `google-drive-workspace` | Google Drive workspace | not_wired | founder |

---

## `supabase`

- **Purpose:** Live tasks/workflows, Chief approval decisions, mission context.
- **Used in:** `lib/supabase/`, `api/chief/approvals`, `api/research/dispatch`, `api/monitor?target=supabase`
- **Env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Failure:** 503 when unconfigured; UI mock fallback when not in live API mode.

## `vercel`

- **Purpose:** Host SPA + `/api`; optional deploy health probe.
- **Used in:** `vercel.json`, `api/monitor?target=vercel`, GitHub Actions deploy workflow
- **Env:** `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `INTERNAL_API_SECRET`, `VITE_INTERNAL_KEY`
- **Failure:** Monitor `ok:false` without tokens; preview 401s on internal API by design.

## `internal-api-auth`

- **Purpose:** Protect `/api` via `x-internal-key`.
- **Used in:** `lib/auth.ts`, `api/health.ts`, `src/lib/api/client.ts`
- **Env:** `INTERNAL_API_SECRET`, `VITE_INTERNAL_KEY`
- **Failure:** 401 JSON when missing/mismatched.

## `obsidian-vault`

- **Purpose:** Approval activity, mission artifacts, build/decision logs.
- **Used in:** `lib/obsidian/`, mission stores, `lib/librarian/create.ts`
- **Env:** `OBSIDIAN_VAULT_PATH`
- **Failure:** Skips writes when unset; partial/empty API results with explicit notes.

## `slack`

- **Purpose:** Outbound governed notifications + manual turnover.
- **Used in:** `lib/governedLoopSlack.ts`, Chief approvals notify paths
- **Env:** `SLACK_WEBHOOK_URL`
- **Failure:** No-op / `console.warn`; core app unaffected. **Inbound not wired.**
- **Do not conflate:** personal `docs/TOOL_CATALOG.md#slack` = inbound/bot
  `future-integration`. This inventory row is **outbound webhook only** (`partial`).

## `github`

- **Purpose:** Signed webhook for gate automation; git/PR work is external.
- **Used in:** `api/github/webhook.ts`, `.github/workflows/ci.yml`
- **Env:** `GITHUB_WEBHOOK_SECRET`
- **Failure:** Rejects bad signatures; **CI status not surfaced in-app.**

## `azure-openai`

- **Purpose:** LLM router for Research/Builder API tasks.
- **Used in:** `src/llm/router.ts`, `api/llm/suggest-tests.ts`
- **Env:** `AZURE_OPENAI_API_KEY`, `AZURE_AI_RESOURCE_ENDPOINT`
- **Failure:** Missions/suggest-tests blocked or failed when misconfigured.

## `ollama`

- **Purpose:** Optional local Librarian refinement.
- **Used in:** `lib/librarian/refine.ai.ts` when enabled
- **Env:** `LIBRARIAN_AI_ENABLED`, `OLLAMA_HOST`, `OLLAMA_MODEL`
- **Failure:** Falls back to deterministic refinement.

## `vercel-mcp`

- **Purpose:** Editor MCP for deploy inspection (Cursor), not app runtime.
- **Used in:** `.cursor/mcp.json`, `docs/AI_STACK.md`
- **Env:** none in app
- **Failure:** Editor-only; authenticate in Cursor. **Prefer read-only deploy checks.**

## `google-drive-workspace`

- **Purpose:** Planned Drive → workspace → Obsidian triage.
- **Used in:** docs/ADR references only on current `main`
- **Env:** none wired
- **Failure:** **not_wired** — do not assume mounted Drive paths in product code.
