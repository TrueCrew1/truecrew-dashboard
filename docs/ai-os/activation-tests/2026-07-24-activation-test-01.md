# Activation Test — 2026-07-24 — Activation Test 01

Status: Draft  
Date: 2026-07-24  
Related CR: docs/ai-os/ (AI OS v0.1 docs initial commit)

Purpose
- Draft end-to-end activation test validating intake, classification, routing, handoff, approval gating, memory writes, and observability across centers.

Scope & scenarios
1. Command Center classification and routing (Chief front door)
   - Input: external request to "generate-code" from internal user
   - Expected: Chief issues request_id, risk_level=low, route → Build Center code-gen-agent pool
2. Build Center workflow (codegen)
   - Input: internal generate-code request that attempts a DB-write (medium risk)
   - Expected: route → infra-change-reviewer approval before execution; blocked until approval artifact attached
3. Research workflow
   - Input: run-experiment in sandbox with canary tag
   - Expected: route → Research sandbox, no infra impact, results stored as experiment-artifact (non-PII)
4. Memory Core write (sensitive)
   - Input: attempt to write PII to persistent-preferences
   - Expected: trigger Data Steward approval predicate; no persistent write until approval; if approved, write with sensitivity tag and retention metadata
5. Fallback & observability
   - Input: code-gen request with primary pool down
   - Expected: fallback to backup pool; if backup down, escalate to human queue after configured timeout. All steps logged.

Environment
- staging routing simulator + activation test harness (or local simulator)
- Azure Foundry-only model routing for any model calls (simulate allowed model responses)

Inputs (examples)
- Request A: {intent: "generate-code", risk_level: "low", user_role: "internal", model_target: "gpt-5.3-codex"}
- Request B: {intent: "modify-infra", risk_level: "medium", user_role: "internal", resource_requirements: "DB-write"}
- Request C: {intent: "run-experiment", risk_level: "low", user_role: "researcher", context_tags: "canary"}
- Request D: {intent: "write-preference", risk_level: "high", data_sensitivity: "pii", user_role: "internal"}

Execution steps
1. Submit Request A to Command Center; verify request_id, classification, and route to code-gen-agent pool.
2. Submit Request B; verify CR/approval artifact created; execution blocked until approver attaches approval artifact.
3. Submit Request C; verify Research sandbox assignment and experiment-artifact written to Memory Core.
4. Submit Request D; verify Data Steward approval workflow triggered and no persistent write until approval artifact is present.
5. Simulate primary code-gen pool down; resubmit Request A variant and verify fallback to backup and eventual human queue if backup down.
6. Collect logs for all requests; verify audit entries: request_id, matched_keys, precedence_path, chosen_target, decision_evidence_id, memory_entry_ids.

Acceptance criteria
- Command Center issues request_id and accurate classification for each request.
- Build Center codegen route executes for Request A without approval.
- Request B is blocked and requires infra-change-reviewer approval; approval artifact required to proceed.
- Request C runs in Research sandbox and writes experiment-artifact to Memory Core.
- Request D triggers Data Steward approval and blocks write until approval; if approved, Memory Core contains appropriately tagged entry.
- Fallback behavior functions as configured.
- All routed requests have complete audit entries persisted.

Notes
- Status: Draft — this activation test is not executed yet and is environment-agnostic.
- Attach activation test artifacts (logs, approval IDs) to the CR when executed.
