# Approval request path — design (Planner/Research/Content, no-code)

**Status: Implemented.** Shipped as `public/approval_requests.json` (data),
`src/lib/agentApprovalRequests.ts` (loader/validator), and the `ChiefPanel.tsx` wiring
(`loadSubmittedAgentApprovalCards`) — the design below reflects what's live, not a
pending proposal.

## 1. Current state

**How Build works today (the only agent that already has a real path):**

`src/components/chief/agentApprovalGates.ts` defines four request interfaces
(`PlannerApprovalRequest`, `BuildApprovalRequest`, `ResearchApprovalRequest`,
`ContentApprovalRequest`) and four `createApprovalCardFrom*Request()` helpers. Build's real
request, `BUILD_REQUEST_DUPLICATE_AUTH_FIX`, is a `const` in that file, listed in
`AGENT_APPROVAL_CARDS`:

```ts
export const AGENT_APPROVAL_CARDS: ApprovalCard[] = [
  createApprovalCardFromPlannerRequest(EXAMPLE_PLANNER_REQUEST),
  createApprovalCardFromBuildRequest(BUILD_REQUEST_DUPLICATE_AUTH_FIX),
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST),
  createApprovalCardFromContentRequest(EXAMPLE_CONTENT_REQUEST),
];
```

`ChiefPanel.tsx` imports this constant and seeds its `commandApprovals` state with it once, on
mount:

```tsx
const [commandApprovals, setCommandApprovals] = useState<ApprovalProposal[]>([
  ...MOCK_PR_APPROVAL_CARDS,
  ...REPO_CHANGE_APPROVAL_CARDS,
  ...AGENT_APPROVAL_CARDS,
]);
```

The only way a *new* real request from any of the four agents reaches this array today is
editing `agentApprovalGates.ts` directly (add a constant, add it to `AGENT_APPROVAL_CARDS`) — a
`src/` code change. That's fine for Build (writing code is its job). It is not fine for
Planner/Research/Content, which `docs/AGENT_RUNBOOK.md` defines as never writing code.

**What's missing:** a way for those three roles to add a real entry to what `ChiefPanel.tsx`
renders, without touching any file under `src/`.

**One relevant precedent already in the code:** `ChiefPanel.tsx` already appends to approvals
state at runtime, outside the initial seed — the Command-tab flow does exactly this:

```tsx
const newApproval = buildApprovalFromResponse(command, result);
if (newApproval) {
  setCommandApprovals((prev) => [newApproval, ...prev]);
}
```

This proves the panel can already accept a new card after mount, from a source other than the
hardcoded seed array. The design below reuses that same append pattern, fed by a new source
instead of typed commands.

## 2. Proposed minimal design

**Data (write path, no code):** a new static JSON file, `public/approval_requests.json`,
default contents `[]`. Planner/Research/Content append plain JSON objects here — editing a data
file, not TypeScript, not application logic. This keeps the "no code" boundary meaningful (they
never open anything under `src/`) rather than just nominal.

**Loader (read path, code — Build-owned, written once as this slice):** a new small module,
`src/lib/agentApprovalRequests.ts`. It fetches `/approval_requests.json` at runtime, validates
each entry (`role` is one of `planner`/`research`/`content`; `gate` is a member of that role's
`APPROVAL_GATES[role]`; required fields present), and maps valid entries through the **existing**
`createApprovalCardFrom*Request()` helpers — zero new mapping logic, zero new taxonomy. Invalid
entries are skipped and logged, not thrown — a malformed file must never break the panel.

**`ChiefPanel.tsx` change:** one new `useEffect`, mirroring the existing decisions-hydration
effect already in the file (`fetchChiefApprovalDecisions()` → `setApprovalDecisions`) — fetch
once on mount, then `setCommandApprovals((prev) => [...prev, ...loaded])`. Same append pattern
already used for the Command-tab flow above; existing id-based de-duplication in the `approvals`
`useMemo` (keyed by `proposal.id` via a `Map`) already protects against a submitted request
colliding with an existing card.

**Why this needs no backend route or DB:** `public/` is already served as static files by Vite
locally and by Vercel in production — reading `/approval_requests.json` via `fetch()` is
identical, mechanically, to fetching any other static asset already in `public/`. No new route
handler, no new persistence layer.

**Explicitly unchanged:** `AGENT_APPROVAL_CARDS`'s structure and contents, `MOCK_PR_APPROVAL_CARDS`,
`REPO_CHANGE_APPROVAL_CARDS`, every `createApprovalCardFrom*Request()` helper, all four
`*ApprovalRequest` interfaces, `APPROVAL_GATES`, and Build's existing path (still edits
`agentApprovalGates.ts` directly for its own real requests — this design doesn't change how Build
operates).

## 3. Exact field list and examples

Each entry in `approval_requests.json` is a plain object: the same fields as the matching
`*ApprovalRequest` interface in `agentApprovalGates.ts`, plus one new `role` discriminator field
(not a schema change to the TS interfaces — just how the loader knows which helper to call).

**Planner example:**
```json
{
  "role": "planner",
  "id": "apr-planner-submit-2026-07-06-01",
  "gate": "New roadmap phase",
  "summary": "Propose starting a Repo Health monitoring phase, scoped to the existing RepoHealthPage surface.",
  "riskLevel": "medium",
  "testsOrChecksDone": [
    { "label": "Checked knowledge/index.md for an existing decision on this", "status": "pass" }
  ],
  "requestedAction": "Approve scoping this as its own phase, or hold pending current phase completion.",
  "affectedPhases": ["Repo Health Monitoring"],
  "createdAt": "2026-07-06T09:00:00.000Z"
}
```

**Research example:**
```json
{
  "role": "research",
  "id": "apr-research-submit-2026-07-06-01",
  "gate": "Vendor selection or contract decision",
  "summary": "Compare two uptime-monitoring vendors for the Reliability Agent's future health-check needs.",
  "riskLevel": "low",
  "testsOrChecksDone": [
    { "label": "Compared 2 vendors on pricing and API access", "status": "pass" }
  ],
  "requestedAction": "Approve a vendor to shortlist, or hold for a wider survey.",
  "alternativesConsidered": ["Better Uptime", "UptimeRobot"],
  "createdAt": "2026-07-06T09:05:00.000Z"
}
```

**Content example:**
```json
{
  "role": "content",
  "id": "apr-content-submit-2026-07-06-01",
  "gate": "External-facing copy shipped to clients or the public",
  "summary": "Draft clearer empty-state copy for the Repo Health page's no-data state.",
  "riskLevel": "low",
  "testsOrChecksDone": [
    { "label": "Reviewed against industrial/operations tone guidance", "status": "pass" }
  ],
  "requestedAction": "Approve copy for publish, or send back with edits.",
  "audience": "client",
  "createdAt": "2026-07-06T09:10:00.000Z"
}
```

`gate` values must exactly match a string already in that role's `APPROVAL_GATES` entry in
`agentApprovalGates.ts` (e.g. Planner: `"Scope change affecting more than one phase"` /
`"New roadmap phase"` / `"Roadmap reprioritization or re-sequencing"`) — the loader rejects
anything else rather than inventing a new gate silently.

## 4. Impact analysis

**Files that would change (pending your approval):**
- New: `public/approval_requests.json` — data only, default `[]`.
- New: `src/lib/agentApprovalRequests.ts` — small loader/validator, Build-owned code.
- Edited: `src/components/chief/ChiefPanel.tsx` — one new `useEffect` + one `setCommandApprovals`
  call, following the file's own existing patterns.

**Stays the same:** everything in `agentApprovalGates.ts`, the Chief Approval Panel's rendering,
decision-recording, and history logic, and Build's existing (unchanged) editing workflow.

**Risk:** low. Purely additive; a missing or empty JSON file degrades to "no submitted requests,"
never an error; a malformed entry is skipped and logged, not thrown.

## 5. Resolved defaults (as shipped)

1. **One shared file vs. per-role files.** Resolved: one `public/approval_requests.json` with a
   `role` field per entry (simplest, one loader) — not three separate files.
2. **Git status of the JSON file.** Resolved: committed normally (git-tracked, reviewable in PRs,
   versioned like any other data) — not gitignored/ephemeral.
3. **Live-reload behavior.** Resolved: no live-sync. `loadSubmittedAgentApprovalCards()` fetches
   `/approval_requests.json` once, on `ChiefPanel` mount — seeing a newly-appended entry during
   local dev needs a manual page refresh; no "reload requests" affordance was built.
4. **Id collisions.** Resolved: no enforced naming convention. De-duplication is purely by
   `proposal.id` — the first valid entry for a given id wins; later duplicates are skipped with a
   `console.warn`.
5. **Malformed-entry visibility.** Resolved: invalid entries are skipped silently from the UI's
   perspective, logged via `console.warn` only — no visible "N malformed requests were skipped"
   note was built.
