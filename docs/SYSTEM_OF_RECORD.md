# System of Record

**Where durable artifacts live — and where they must not.**

> **Rule:** No important work lives only in chat, Slack, or transient agent output. File it.

True Crew is an operations and maintenance command center. Durable artifacts split across
three primary sinks plus Slack for delivery only:

| Sink | Role |
|------|------|
| **Obsidian** | Operational memory (field/shift context) |
| **Repo markdown** | Engineering source of truth |
| **Notion** | Shared ops workspace (backlog, tracker, dashboards) |
| **Slack (Scout)** | Delivery — never archival |

See also [adr/0001-chief-foreman-architecture.md](adr/0001-chief-foreman-architecture.md).

---

## Primary sinks

### Obsidian — operational memory

Day-to-day operator and field context that must survive beyond a session.

- Daily logs and shift summaries
- Incident notes and triage scratchpads
- Maintenance logs and PM completion records
- Research scratchpads and investigation threads
- Operator decision narratives (via `npm run obsidian:log decision`)
- Hot context (`True Crew/Hot Context.md`)

Vault path: configured by `OBSIDIAN_VAULT_PATH`. Write CLI: `npm run obsidian:log`.
Read API: `GET /api/obsidian/notes` (read-only).

### Repo markdown — engineering source of truth

Structural and engineering artifacts that ship with the codebase.

- ADRs (`docs/decisions/`, `docs/adr/`)
- Specs and architecture docs (`docs/architecture/`)
- Runbooks and integration docs (`docs/`, `docs/vault-templates/`)
- Postmortems (committed after incident close)
- Release notes and changelog (`CHANGELOG.md`)
- Agent governance (`docs/AGENT_*.md`, this file)

### Notion — shared ops / workspace

Cross-functional views for operators, supervisors, and stakeholders who do not live in the repo or vault.

- Task boards and work queues
- Status dashboards
- Maintenance backlog
- Incident tracker (shared view)
- Maintenance backlog and PM schedule views (supervisor-facing)

**Status today:** planned sink — no Notion sync in repo yet. Do not treat Notion as SoR until integration exists.

### Slack (Scout) — delivery channel, not archival

- Alerts, digests, and summaries pushed to operators
- Ephemeral Q&A and notification threads

**Slack is never the system of record.** Any decision, incident fact, or maintenance record
surfaced in Slack must be mirrored to Obsidian, repo, or Notion within the same workflow.

---

## Artifact mapping

| Artifact type | Primary system of record | Secondary mirrors |
|---------------|-------------------------|-------------------|
| Daily / shift status | Obsidian (`Decisions/` or daily log note) | Notion status dashboard (when wired) |
| Incident brief (active triage) | Obsidian (incident note) | Notion incident tracker; repo postmortem after close |
| Incident postmortem | Repo (`docs/` or dedicated postmortem path) | Obsidian link from postmortem; Notion incident closed record |
| ADR | Repo (`docs/decisions/` or `docs/adr/`) | Obsidian decision log entry; Notion architecture page (optional) |
| Feature / slice spec | Repo (`docs/architecture/` or PR description) | Obsidian hot context if blocking active work |
| Runbook | Repo (`docs/` or vault-templates seed) | Obsidian operational copy if operators need vault access offline |
| Maintenance item / PM record | Notion maintenance backlog (when wired) | Obsidian maintenance log; work order in app DB |
| Work order / field task | App database (Supabase) | Today page UI; Obsidian shift note if operator-added context |
| Research memo | Obsidian (research scratchpad) | Repo ADR or spec if decision changes architecture |
| Approval decision | Supabase `chief_approval_decisions` | Obsidian `obsidian:log decision`; governance events (session) |
| PR / merge record | GitHub + repo git history | Obsidian `obsidian:log pr`; `audit_events` for gate automation |
| Customer-facing copy | Repo (if in app) or CMS (future) | Notion content planning; Chief approval card before publish |
| Alert / monitor snapshot | Transient (Monitor UI, Slack) | Obsidian incident note if escalated; `audit_events` for webhooks |
| Agent job outcome | Runtime job log (planned) | Artifact at target sink per job type |

---

## Rules

1. **No important work lives only in chat or transient agent output.** Model replies, Slack
   threads, and session-scoped Chief cards are pointers — not archives.

2. **Write once, mirror intentionally.** Pick one primary sink per artifact type (table
   above). Secondary mirrors are links or summaries, not competing truths.

3. **Approvals are recorded, not executed.** The durable approval record is
   `chief_approval_decisions` plus an Obsidian decision note. Execution artifacts (merged
   PR, filed note, Notion update) are separate steps after approval.

4. **GitHub is SoR for code; repo markdown is SoR for engineering decisions.** Do not store
   authoritative ADRs only in Obsidian or Notion.

5. **When in doubt, file to Obsidian for ops context and repo for engineering context.**
   Escalate to an ADR if the choice affects architecture, agent boundaries, or sinks.

6. **Cloud drives are intake/archive only, never a sink.** Google Drive, OneDrive, and
   iCloud (outside of iCloud's role as the sync transport for the live Obsidian vault
   itself) hold nothing authoritative. A file living only in a cloud drive is not filed —
   move it into Obsidian, the repo, or Notion before treating it as recorded. Google
   Drive is already `HUMAN-ONLY` in `AGENT_RUNBOOK.md`'s Tool Catalog; this rule extends
   the same posture to OneDrive and to iCloud folders outside the vault.

---

## Governed note frontmatter

Notes filed under a governed type (today: `decision`, `maintenance` — written via
`npm run obsidian:log` / the Librarian and Maintenance runtime pipelines) carry a
minimal, consistent frontmatter schema so the sink table above is queryable per-note,
not just documented in prose:

| Field | Meaning |
|-------|---------|
| `type` | Governed note type (`decision`, `maintenance`, …) |
| `status` | `active` / `tentative` / `deprecated` — same vocabulary as `AGENT_RUNBOOK.md`'s Memory Governance status markers |
| `owner` | Who's accountable for the note staying current. Defaults to `null` (empty) today — no pipeline input carries a real owner yet, and `null` reads as "not yet set" rather than a fabricated value |
| `source_of_truth` | `repo` / `vault` / `external` — which system holds the authoritative version. Decision and maintenance notes default to `vault`: the note itself is authoritative, nothing mirrors it elsewhere |
| `last_reviewed` | Date the note was last confirmed current. Defaults to its logged date at creation time |
| `tags` | Free-form list for future filtering. Defaults to `[]` — no pipeline input carries tags yet |

`owner` and `tags` are honest placeholders, not real automation — see
`OBSIDIAN_LOGGING.md`'s Manual vs automated table. Populating them from a real input
(a CLI flag, a payload field) is a separate, later change.

---

## Related docs

- [OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md) — vault paths and CLI
- [AGENT_ECOSYSTEM.md](AGENT_ECOSYSTEM.md) — which agent writes to which sink
- [CHANGE_CONTROL.md](CHANGE_CONTROL.md) — doc updates as change control
