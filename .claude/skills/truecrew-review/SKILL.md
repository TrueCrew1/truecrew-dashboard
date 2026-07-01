---
name: truecrew-review
description: Review True Crew code or UI for quality — scope drift, broken assumptions, field-service usability, naming/states, and unjustified product claims.
---

# True Crew review

Use this when reviewing a diff, PR, or UI change in the True Crew dashboard.

## Behavior

Check for, in order:

1. **Scope drift.** Does the change do only what was asked? Flag any unrelated refactor,
   dependency add, or "while I'm in here" edit — see [project-rules.md](../../project-rules.md).
2. **Broken assumptions.** Does the change assume data, an API shape, or a user flow that isn't
   actually true in this repo? Check against `src/types`, `src/lib/api`, `api/`.
3. **Field-service usability.** Would this hold up for a supervisor/operator on a phone or tablet
   at a job site — not just at a desk?
4. **Naming, states, empty states, mobile practicality.** Consistent naming with existing
   `src/pages`/`src/components`; real empty/loading/error states, not just the happy path;
   layout that survives a small screen.
5. **Tone.** Flag copy that reads generic-SaaS instead of industrial/operations — see the
   `src/data/mockData.ts` drift noted in [CLAUDE.md](../../../CLAUDE.md).
6. **Hallucinations or unjustified product claims.** Flag any feature, integration, metric, or
   capability the change implies exists but isn't backed by actual code or an explicit request.

Report findings as a short list, most important first. Don't rewrite the code yourself unless
asked — a review flags issues, it doesn't silently fix them.
