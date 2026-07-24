# AI OS — Routing Table v0.1

Status: Draft  
Version: 0.1  
Last updated: 2026-07-24

Purpose
- Canonical routing logic and precedence for directing requests across Command Center, Build Center, Research, Memory Core, and human queues.

Routing model
- Request: any incoming intent or external event.
- Route: mapping from route keys to targets (agent pools, human queues, approval workflows).
- Chief (front door) issues request_id and initial route keys.

Route keys (matching inputs)
- intent: e.g., generate-code, modify-infra, run-experiment, fetch-memory, escalate-support.
- risk_level: low | medium | high | critical (computed by Chief/risk rules).
- user_role: internal | external | admin | reviewer.
- data_sensitivity: public | internal | sensitive | PII | restricted.
- resource_requirements: compute-heavy | DB-write | external-call.
- context_tags: experiment | canary | debug | urgent.
- model_target: which allowed model to use (Azure Foundry-only list).

Routing precedence (highest → lowest)
1. Safety hold (T&S human review)
   - Any matching safety hold predicates (embargoed intents, T&S blocklists, executive embargo) must route to T&S review and block automated execution.
2. Critical approvals
   - critical risk_level OR (PII AND DB-write) → approval queue (T&S + Data Steward) before execution.
3. Explicit operator override
   - Operator or policy-defined explicit route rules.
4. Center-specific intent handlers
   - e.g., Build Center: generate-code → code-gen-agent-pool; modify-infra → infra-approval flow.
   - Research: run-experiment intents with sandbox flag.
   - Memory Core: fetch-memory / write-memory intents with sensitivity checks.
5. Default route
   - General-purpose assistant pool for low-risk, low-sensitivity intents.

Safety hold predicates (examples)
- Any request with embargoed project tag
- Data steward blocklist for a user or dataset
- Model or dataset flagged in T&S matrix

Approval routes
- Multi-stage approval artifacts are created with required approvers based on predicates:
  - Multi-review: Engineering + T&S (for high risk infra/memory changes)
  - Executive/T&S: required for policy-bypass or critical safety changes
- Approvals recorded with identity, timestamp, and artifact ID.

Fallbacks & Timeouts
- Unavailable target: after X seconds (route-configurable), route to backup pool; after Y seconds, route to human queue.
- Repeated failures: after N failures in M minutes mark route degraded and alert Command Center.

Observability & Audit
- Each routed request must log:
  - request_id, matched route keys, precedence path, chosen target, timestamps
  - decision evidence (policy id, approval artifact id if required)
  - execution trace and memory write IDs
- Logs must be retained according to retention policy and be queryable for audits.

Examples across centers
- Command Center
  - external_support + low → support-assistant pool (Chief assigns)
  - urgent_escalation + any → human on-call via escalation path
- Build Center
  - generate-code + low + internal → code-gen-agent-v1 pool (automated)
  - modify-infra + medium+ → infra-change-reviewer (human) → approved agent
- Research
  - run-experiment + canary + low → research-sandbox (restricted resources)
- Memory Core
  - fetch-memory + internal + sensitivity=public → read via Memory Core API
  - write-memory + pii → require Data Steward approval before persistent write

Change control & deprecation
- Adding/modifying routes requires CR with rationale, rollback plan, activation test, and relevant approvals (T&S for safety changes).
- Routes may be versioned (e.g., code-gen-agent-v1 → v2) and deprecated with at least one deployment cycle notice.

Integration constraints
- Production model routing restricted to Azure Foundry models listed in Operating Plan.
- Chief must be used for front-door classification.
