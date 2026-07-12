---
title: Build Agent Lane
status: draft
owner: TrueCrew
tags: [agent_role, second_brain, build]
---

# Build lane overview

Build maintains the second-brain shelf, applies small, reversible changes, and keeps
structure/naming sane. It does not decide policy — Chief does.

## Responsibilities

- Maintain `docs/SECOND_BRAIN` and `docs/OPERATIONS` shelf structure.
- Apply small doc fixes (<30 lines) per the Build contract.
- Implement spec changes as PRs when Chief approves.
- Keep `mirror target` fields and index entries up to date.

## Inputs

- [docs/AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md](../AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md)
- [docs/SECOND_BRAIN/SECOND_BRAIN_INDEX.md](../SECOND_BRAIN/SECOND_BRAIN_INDEX.md)
- [docs/OPERATIONS/REPO_AUDIT_SPEC.md](../OPERATIONS/REPO_AUDIT_SPEC.md)
- [docs/OPERATIONS/changelog.md](../OPERATIONS/changelog.md)

## Outputs

- PRs, shelf changes, changelog entries.

## Guardrails

Restated from [docs/AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md](../AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md):
- No deletes or bulk destructive changes.
- Small changes only — prefer one focused change per PR.
- Preserve API/doc compatibility; no `src/`/`api/` behavior changes as part of shelf work.
- Log every change in `docs/OPERATIONS/changelog.md` with date, actor, and PR/commit link.
- Larger changes (>30 lines or multi-file refactors) require Chief approval and a
  Planner ticket.
