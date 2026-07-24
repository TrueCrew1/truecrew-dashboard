# AI OS — Operating Plan v0.1

Status: Draft  
Version: 0.1  
Last updated: 2026-07-24

Purpose
- Provide the canonical operating plan for True Crew’s AI Operating System ("AI OS") covering intake, routing, verification, handoffs, approvals, memory, activation tests, and continuous improvement for v0.1.

Scope
- Applies to AI OS run-time intake/routing, handoff envelopes, approval workflows, memory schema, activation tests, and the teams/centers that operate and evolve these artifacts.
- Excludes implementation code; docs are canonical source of truth under docs/ai-os/. Obsidian is a secondary mirror for notes and summaries.

Core organization (centers)
- Command Center: front door for external and internal requests. Chief is the front door routing agent into AI OS. Responsible for classification, initial risk scoring, and issuing request IDs.
- Build Center: code-generation, infra changes, and orchestrated execution (code-gen agents, infra-change flows).
- Research: experiments, model evaluation, and data analysis workflows (sandboxed, reviewable).
- Memory Core: canonical storage and retrieval for session-history, persistent preferences, system prompts, and sensitive namespaces.
- Command Center, Build Center, Research, Memory Core together form the operational lanes for AI OS.

Standard intake-to-verification workflow
1. Intake (Chief → Command Center)
   - Chief receives request, records request ID, classifies intent, computes risk_level and data_sensitivity, and issues to routing.
2. Routing & Triage
   - Routing engine matches route keys (intent, risk_level, user_role, data_sensitivity, resource_requirements, context_tags) per Routing Table.
   - If Safety hold predicates match, route to T&S human review.
3. Pre-execution verification
   - For routes requiring approval, block automated execution; create approval artifact and send to required approvers.
   - For safe automated routes, assign to target agent/pool in Build Center or Research sandbox.
4. Execution & Memory interactions
   - Execute in the target environment, record all decisions, and write required memory entries to Memory Core with correct sensitivity tags and retention markers.
5. Handoff & Sign-off
   - Use Handoff Template for any agent→agent or agent→human transfers.
   - Close with acceptance criteria and attach evidence/artifacts.
6. Post-run & Changelog
   - Attach activation test artifacts to the CR where applicable. Update changelog and metrics.

Onboarding
- New teams/agents read Operating Plan, Routing Table, Memory Schema, Approval Policy, and Handoff Template.
- Checklist: identity (SSO), least privilege credentials, staging sandbox access, pass basic activation tests in staging routing simulator.

Daily operations
- Command Center monitors intake rate, classification accuracy, Chief front-door latencies.
- Build Center monitors agent health, success/failure rates for codegen and infra flows.
- Research monitors experiment isolation and result reproducibility.
- Memory Core monitors growth, sensitive access, and retention compliance.
- Weekly routing & memory schema review with changelog entry.

Change Requests (CRs)
- CR must include rationale, rollback plan, activation test path under docs/ai-os/activation-tests/, schema migration plan if applicable, and risk assessment.
- T&S signoff required before merges that affect approval policy, routing safety holds, or sensitive memory retention.
- For v0.1, docs are documentation-only and require human review before merging.

Incidents
- Triage in Command Center; assign severity and responsible center.
- For Sev2+ prepare a public postmortem and include activation test evidence.
- If routing or memory corruption suspected, invoke stop-the-world mitigation from Routing Table and Memory Schema docs.

Release & Versioning
- Docs versioned semantically at v0.x until v1.0.
- Activation tests are time-stamped and attached to CRs.
- No automatic merges or deployments from this documentation-only branch — human review enforced.

Metrics & KPIs
- Chief front-door latency (ms)
- Classification accuracy (Command Center)
- Mean time to detect (MTTD) routing/memory incidents
- Mean time to restore (MTTR)
- Percentage of CRs with passing activation tests and required approvals

Governance notes
- Azure Foundry-only model routing for production model calls.
- Allowed production models: gpt-5.6-sol, gpt-5.3-codex, gpt-5-mini, DeepSeek-V3.2, DeepSeek-V4-Pro, Kimi-K2.5, Kimi-K2.6, Mistral-Large-3, text-embedding-3-small.
- Chief is the front door and must be used for initial intake classification and ID issuance.

Change Log
- v0.1 initial draft created 2026-07-24.
