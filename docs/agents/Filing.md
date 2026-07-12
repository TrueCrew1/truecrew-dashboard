---
title: Filing Agent Lane
status: draft
owner: TrueCrew
tags: [agent_role, second_brain, filing]
---

# Filing lane overview

Filing mirrors repo specs/docs into the Obsidian vault and maintains filing notes and
redirects. It does not author specs — it moves what Chief/Build have already approved.

## Responsibilities

- Mirror approved `docs/SECOND_BRAIN` and `docs/OPERATIONS` docs into vault paths.
- Maintain redirect notes and archives per vault conventions.
- Ensure deterministic paths and filenames for mirrored notes.

## Inputs

- [docs/AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md](../AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md)
- [docs/SECOND_BRAIN/SECOND_BRAIN_INDEX.md](../SECOND_BRAIN/SECOND_BRAIN_INDEX.md)
- [docs/SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md](../SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md)

## Outputs

- Vault notes, redirect notes, filing log entries.

## Guardrails

Restated from [docs/AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md](../AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md):
- No automatic deletes — deletion requires explicit Chief approval and a documented PR.
- Dry-run required for bulk operations — preview/diff before applying.
- Deterministic filenames and paths; avoid ad-hoc naming.
- Log every change in `docs/OPERATIONS/changelog.md` with actor and short summary.
