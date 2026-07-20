---
id: workflow-2026-07-20-mobile-field-closeout
title: Mobile field closeout
type: workflow_observation
status: draft
truth_level: reported
scope: ops-workflow
sensitivity: internal
regs: []
data_type: desk_research
created_by: research
created_at: 2026-07-20
updated_at: 2026-07-20
links: [https://help.onupkeep.com/en/articles/4712557-how-to-use-upkeep-offline-b, https://upkeep.com/mobile-cmms-maintenance-app/]
tags: [mobile, field, closeout]
workflow: mobile-closeout
evidence_strength: medium
---

# Mobile field closeout

> File under `knowledge/sources/`. Schema: `knowledge/reference/knowledge-schema.md`.

## Context

Public mobile CMMS docs/marketing for how technicians close work away from a desk. Not a TrueCrew field observation.

## Workflow observed

1. Tech opens assigned WO on phone (push notification common in marketing).
2. Works checklist / procedure; captures photos, readings, signatures.
3. If offline: updates cached WOs / drafts; syncs when connectivity returns (plan limits on cache size documented by UpKeep help).
4. Status update completes the WO; history lands on the asset.

Sources: UpKeep mobile CMMS page; UpKeep offline help article.

## Friction / failure points

- Offline feature often **plan-gated** (fewer cached WOs on lower tiers).
- Sync conflicts and “thought I closed it” gaps are not well documented publicly — treat as unknown.

## Implications for TrueCrew

Field closeout is table stakes for CMMS; TrueCrew should assume closeout happens in another system and focus on **supervisor visibility of stuck/open items**, not replacing the mobile WO app.

## Open questions / next actions

- Which closeout fields supervisors actually check (photos? hours? parts?).
- How TrueCrew Monitor/Today shows “open too long” without owning the WO form.
