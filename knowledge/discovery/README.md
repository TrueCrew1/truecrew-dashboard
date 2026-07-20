# Discovery capture

Early-stage SaaS discovery notes for TrueCrew — interviews, findings, workflow
observations, competitor profiles, assumptions, and open questions.

This folder is the **minimum viable structured capture** layer for researchers and
agents. It sits beside (does not replace) `sources/`, `concepts/`, `projects/`, and
`decisions/`.

## Where notes go

| Note type | Folder | Template |
|-----------|--------|----------|
| Interview | `interviews/` | `../templates/interview-template.md` |
| Finding | `findings/` | `../templates/finding-template.md` |
| Workflow observation | `workflows/` | `../templates/workflow-observation-template.md` |
| Competitor / alternative | `competitors/` | `../templates/competitor-profile-template.md` |
| Assumption | `assumptions/` | `../templates/assumption-template.md` |
| Open question | `questions/` | `../templates/question-template.md` |

Product/policy **decisions** still live in `../decisions/` (use
`../templates/decision-template.md`).

## How to file (this week)

1. Copy the matching template from `../templates/`.
2. Fill required frontmatter — see `../reference/knowledge-schema.md`.
3. Save under the folder above with a slug filename, e.g.
   `2026-07-20-fleet-pm-interview.md`.
4. Append one line to `../log.md`.
5. Link durable outcomes into `concepts/` / `decisions/` later via a Second Brain
   Starter Pass — do not skip discovery capture waiting for perfect synthesis.

## Rules

- Prefer updating an existing discovery note over creating a near-duplicate.
- Hypotheses and assumptions are **not** policy — set `truth_level` honestly.
- Regulated / sensitive content: follow `../reference/regulated-content.md`.
- Soft guidance: keep discovery notes high-signal; if a folder grows noisy, promote
  reusable judgment into `concepts/` / `decisions/` rather than inventing new folders.
