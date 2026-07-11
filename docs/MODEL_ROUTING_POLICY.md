# Model Routing Policy

**Cheap-first AI usage — locked tiers and escalation rules.**

> **Cheap-first rule:** Start at Tier 0. Use Tier 1 for drafts and extraction. Escalate to Tier 3 only when stakes, complexity, or validation failure require it. One-shot premium for a Tier 0–1 task is out of policy.

This policy applies to all True Crew agent work: in-app specialists, external lanes
(Cursor, Continue, Claude), and any future runtime orchestration. Goal: correct outcomes
with minimum premium model spend.

See [EXECUTION_KIT.md](EXECUTION_KIT.md) for tool lanes and
[CHANGE_CONTROL.md](CHANGE_CONTROL.md) for in-scope work.

---

## Tiers

### Tier 0 — No AI

Pure code, transforms, rules, and deterministic lookups.

**Use for:** grep/file reads, schema validation, gate key checks, formatting transforms,
template fill from structured data, CI scripts, Supabase queries, webhook signature verify.

**Cost profile:** Zero marginal AI cost.

---

### Tier 1 — Free / local / cheap AI

Extraction, classification, templating, first-pass drafts, note filing, label/tag assignment.

**Use for:** filing Obsidian notes from structured fields; classifying incident severity
from a template; extracting checklist items from a spec; autocomplete and narrow edits;
Scout-style read-only repo Q&A with evidence quotes; seeding approval card summaries from
typed request objects.

**Typical surfaces:** Continue + local Ollama (`.continue/config.yaml`); small cloud models
for batch extraction.

**Cost profile:** Lowest — prefer this tier for high-volume, low-stakes work.

---

### Tier 2 — Mid-tier AI

Polishing, moderate synthesis, structured summaries, multi-source merge into one doc.

**Use for:** incident brief drafts from notes + metrics; runbook updates from PR diff
summaries; Today page operator summaries; research memos with cited sources; PR description
drafts from commit list.

**Cost profile:** Moderate — default for “write something readable from known inputs.”

---

### Tier 3 — Premium AI

Hard reasoning, architecture decisions, high-stakes incident analysis, final judgment on
ambiguous tradeoffs.

**Use for:** ADR authoring when alternatives have real consequences; architecture/spec lane
(Primary Claude) turning contradictions into bounded build specs; security-sensitive code
review; Sev 1 incident root-cause analysis when Tier 2 draft failed validation; Chief
escalation summaries when signals conflict.

**Cost profile:** Highest — reserved, not default.

---

## Routing principle

1. **Try lower tiers first.** Start at Tier 0; only add AI when rules cannot complete the task.
2. **Use iterative refinement.** Tier 1 draft → Tier 2 polish → Tier 3 only if validation fails or stakes demand it. Multiple cheap passes beat one expensive pass.
3. **Escalate on complexity, risk, or validation failure.** Escalate when: irreversible action is proposed; architecture or data model changes; incident with customer impact; Tier 1/2 output fails checklist or contradicts repo facts.
4. **One-shot premium prompts for tasks that could be handled by lower tiers are out of policy.** Do not open a Tier 3 session for filing a note, formatting a table, or summarizing a single file.

---

## Examples (True Crew tasks)

| Task | Start tier | Escalate when |
|------|------------|---------------|
| Obsidian note filing from operator bullet list | Tier 1 (template + classify) | Note implies architecture change → Tier 2 summary + ADR trigger |
| Incident brief generation | Tier 1 (extract fields) → Tier 2 (narrative) | Sev 1, conflicting signals, or customer-facing impact → Tier 3 |
| ADR draft | Tier 2 (structure from decision notes) | Cross-cutting tradeoffs, new agent boundary, or auth/data model → Tier 3 |
| Customer-facing summary | Tier 2 (draft from approved facts) | New public claims or layout change → Tier 3 + Chief content gate |
| Code review for risky changes | Tier 1 (diff extract, lint) → Tier 2 (review) | Auth, migrations, RLS, or gate automation → Tier 3 |
| PM / work-order shift summary | Tier 0 (query Today read model) → Tier 1 (template) | Conflicting crew assignments or SLA risk → Tier 2 |

---

## Lane alignment (current tooling)

| Lane | Default tier | Notes |
|------|--------------|-------|
| Scout lane (Continue, read-only — dev tool) | Tier 0–1 | Evidence quotes; not the Slack Scout bot |
| Build (Cursor / Claude Code) | Tier 1–2 | Implementation with spec; escalate for design |
| Architecture / spec (Primary Claude) | Tier 3 | No repo access — produces specs for Build |
| Draft / QA text (free web tools) | Tier 1–2 | Text only; never given secrets or repo paths |

---

## Enforcement (today)

This policy is **documented convention**, not automated routing. Agents and operators
self-check before starting a session. Future runtime may enforce tier tags on jobs.

Violations to avoid:

- Premium model for grep-equivalent questions
- Skipping Tier 0 validation before asking AI to “check the code”
- Archiving Tier 3 chat as SoR without filing to Obsidian/repo (see [SYSTEM_OF_RECORD.md](SYSTEM_OF_RECORD.md))

---

## Related docs

- [AGENT_ECOSYSTEM.md](AGENT_ECOSYSTEM.md) — agent roles and sinks
- [RUNTIME_GOVERNANCE.md](RUNTIME_GOVERNANCE.md) — approval before irreversible actions
- [adr/0001-chief-foreman-architecture.md](adr/0001-chief-foreman-architecture.md) — cheap-first as architecture decision
