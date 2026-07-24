# AI OS — Memory Schema

Status: Draft  
Version: 0.1  
Last updated: 2026-07-24

Purpose
- Canonical memory schemas, namespaces, retention, access controls, evolution, and hygiene for Memory Core.

Namespaces (examples)
- system-prompts: versioned system-level prompts and defaults (indefinite retention).
- session-history: per-session transcripts (default 30 days).
- persistent-preferences: user preferences (default 2 years or until delete).
- experiment-artifacts: Research outputs, sandboxed (retention per experiment).
- sensitive-store: high-sensitivity entries requiring Data Steward approval.

Entry model (recommended)
- id: UUID
- namespace: string
- created_at: ISO8601
- last_accessed: ISO8601
- owner: agent | user (redacted reference)
- sensitivity: public | internal | sensitive | pii | restricted
- schema_version: semver
- content: text/blob (encrypted at rest)
- metadata: JSON (intent, confidence, source_request_id)

Schema examples
- session-history (v1)
  - id, session_id, timestamp, actor, content, metadata
- persistent-preferences (v1)
  - id, user_ref (hashed), preference_key, value, sensitivity, created_at, updated_at

Retention & deletion
- Defaults:
  - session-history: 30 days
  - persistent-preferences: 2 years
  - system-prompts: indefinite (versioned)
  - experiment-artifacts: configurable per experiment
- Deletion:
  - Soft-delete with purge after retention.
  - PII deletions should include cryptographic erasure where applicable and a recorded proof-of-deletion artifact.

Access controls & auditing
- Principle of least privilege: tokens scoped by namespace and sensitivity.
- All reads/writes to sensitive or PII namespaces must be logged with caller identity and purpose.
- Access requests for sensitive namespaces require just-in-time approval when predicate matched.

Schema evolution & migrations
- Additive changes preferred. Breaking changes require:
  - migration plan
  - activation test showing migration correctness
  - T&S review if sensitivity or retention affected
- Maintain a schema registry (location documented in CR) with versions and migration scripts.

Memory hygiene & privacy
- Avoid storing raw identifiers; use hashed references or identity store tokens.
- Redact or mask PII unless explicit consent and approvals exist.
- Periodic scrub jobs to detect accidental PII storage.

Monitoring & alerts
- Monitor namespace growth, read/write patterns, unusual spikes in sensitive access.
- Alert on abnormal read volumes or cross-region reads of sensitive namespaces.

Change control
- Memory schema changes require CR, migration plan, activation test, and T&S approval when sensitivity is impacted.

Notes on canonical vs. retrieval
- Markdown files under docs/ai-os/ are canonical. Embeddings (text-embedding-3-small) may be used as retrieval aids but do not replace canonical markdown.
