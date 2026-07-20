# Sources

Raw and structured capture notes for the TrueCrew vault. This folder is part of the
**existing** governed knowledge system (not a separate research repository).

## What belongs here

| Kind (`type`) | Template |
|---------------|----------|
| `interview` | `../templates/interview-template.md` |
| `finding` | `../templates/finding-template.md` |
| `workflow_observation` | `../templates/workflow-observation-template.md` |
| `competitor_profile` | `../templates/competitor-profile-template.md` |
| `assumption` | `../templates/assumption-template.md` |
| `question` | `../templates/question-template.md` |
| Legacy PR / runbook artifacts | `../templates/source-template.md` (`type: source`) |

**Decisions** still go in `../decisions/` (`type: decision`).

## How to file

1. Copy the matching template.
2. Fill required frontmatter — see `../reference/knowledge-schema.md`.
3. Save here as `YYYY-MM-DD-short-slug.md`.
4. Append one line to `../log.md`.
5. Promote durable judgment into `concepts/` / `decisions/` via a Second Brain
   Starter Pass when ready — do not invent a parallel folder tree.

## Rules

- Prefer updating an existing note over creating a near-duplicate.
- Hypotheses and assumptions are **not** policy — set `truth_level` honestly.
- Regulated / sensitive content: follow `../reference/regulated-content.md`.
- Keep high-signal; promote reusable judgment rather than hoarding forever.
