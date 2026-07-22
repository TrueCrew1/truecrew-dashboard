---
title: Unified command/search — parsing, routing, and source trust must stay explicit
type: lesson
status: active
confidence: high
source_workflow: ad hoc dashboard delivery (unified command search, 2026-07-21)
source_agent: Build
category: orchestration-pattern
related_pages: [chief-approvals, unified-command-search]
related_prs: []
last_reviewed: 2026-07-21
---

## Rule to remember

A command bar becomes operationally valuable only when **query parsing**, **source
trust**, **routing**, and **diagnostics** are explicit — not when a search input is
wired to a single list or left cosmetic.

Before calling command/search "done," "mocked," or "fully live," classify each
provider as **live**, **adapter-backed**, or **mixed**, document Chief vs ecosystem
routing separately, and ensure failures log to a grep-friendly channel (`[command-search]`).

---

## What shipped

Unified command/search layer in truecrew-dashboard (2026-07-21):

- `src/lib/search/` — parse, search, rank, dispatch
- `GET /api/search` and `POST /api/search`
- `CommandBar` in TopBar (`⌘K`, grouped results, Enter dispatch)
- `chiefCommandFocus.ts` — Chief command input bridge
- Tests: `src/lib/search/commandSearch.test.ts`

Canonical detail: `docs/build-notes/2026-07-21-command-search.md`.

---

## What was risky

- TopBar search input had **no handler** — easy to misread as "search exists."
- Chief had panel ops routing but **no cross-entity retrieval** — easy to conflate
  with TopBar command routing.
- Static program cards and research queue could be mistaken for **live ops state**.
- Mock agent rows could be cited as **fleet status** without cross-checking Agents tab.
- No shared diagnostics — "command went nowhere" was hard to trace.

---

## What worked

- Single module (`src/lib/search/`) with explicit types, providers, parser, router.
- **Source trust table** per provider (live / adapter / mixed) in docs and context builder.
- **Separate routing paths** for Chief handoff, ecosystem assignment, and navigation.
- **`[command-search]` logging** for intent, dispatch, and failures.
- Local search for instant UX; API for server parity without coupling UI to network.
- Tests locking parser and dispatch behavior.

---

## Recovery / debugging implications

When search or dispatch fails:

1. Open [unified-command-search reference](../reference/unified-command-search.md) —
   trust model and debug order.
2. Check `DataContext.source` — mock rail explains empty or demo-shaped results.
3. Grep `[command-search]` — confirms intent and dispatch path taken.
4. Run `src/lib/search/commandSearch.test.ts` — regression on parser/router.
5. For Chief handoff: verify `ChiefPanel` subscribes to `chiefCommandFocus` (prefill
   only; does not auto-execute `resolveChiefCommand`).
6. For API 401: align `x-internal-key` / env secrets.

Do **not** rebuild the layer from scratch; extend providers or parser in place and
update the trust table.

---

## Apply when

- Extending TopBar command/search, palette, or "ask the system" entry points.
- Adding a provider — declare live vs adapter vs mixed in reference + build note.
- Debugging "nothing found" or "went nowhere" reports.
- Writing agent docs about Chief or ecosystem behavior.

## Avoid when

- Task is Chief panel ops only — use `chiefCommandRouter.ts` docs.
- Task is ms-painting field ops — federated search belongs in a future adapter, not a
  rewrite inside ms-painting.

---

## Related references

- [reference/unified-command-search.md](../reference/unified-command-search.md) —
  pointer map (flow, routing, trust, observability)
- `docs/build-notes/2026-07-21-command-search.md` — canonical repo feature doc
- `docs/internal/chief-command-center-runtime-truth.md` — Chief runtime truth (separate)
- [concepts/chief-approvals.md](../concepts/chief-approvals.md) — approval gates unchanged
