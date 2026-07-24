---
title: "Research Package Obsidian Template"
status: "template"
type: "obsidian-standard"
scope: "global"
owner: "Research Center"
tags:
  - standards
  - template
  - obsidian
  - research
---

# Research Package Obsidian Template

This template defines the standard Obsidian note structure for filing a completed research package. It is a concise, navigable summary layered on top of the full research specification, not a replacement for the spec itself.

Research agents should copy this template into a project-specific note and then fill it from the builder-ready research package and its source documents.

## Frontmatter Fields

Each project-specific research note based on this template should use frontmatter like:

```yaml
***
title: "<Package title, e.g. 0100 - Initiative Package>"
id: "<request_id or package_id>"
date: "<YYYY-MM-DD>"
status: "<draft|blocked|complete>"
priority: "<P0|P1|P2|null>"
project: "<Project name>"
initiative: "<Initiative name>"
owner: "<Responsible person or role>"
related_docs:
  - "<path or link to full research spec>"
  - "<path or link to source plan>"
  - "<path or link to market brief>"
tags:
  - research
  - package
  - "<project tag>"
***
```

Replace placeholder values with real data when creating a package note. Do not change the field names unless the OS standard is updated.

## Summary

Provide a short narrative summary of the research package:

- What initiative this package covers.
- The scope and boundaries of the work.
- The current status, for example blocked, ready for build, or pending legal review.
- The main outcome the initiative is intended to achieve.

This section should be readable in under 30 seconds and tie directly to the full research specification.

## Key Findings

List the most important findings and decisions from the research package, such as:

- Confirmed user problems and workflows.
- Accepted functional requirements and non-goals.
- Technical constraints and architectural decisions.
- Critical security, legal, or reliability implications.
- Major trade-offs or rejected options.

Use bullets. Each item should be traceable back to the full research document or its source evidence.

## Builder Handoff

Summarize implementation-ready information for Build:

- The main tasks or workstreams implied by the package.
- Dependencies between tasks or initiatives.
- Acceptance criteria that must be met for this package to be considered done.
- Any feature flags, migration requirements, or rollout constraints.

This section does not replace the detailed spec; it highlights what Build should pay attention to first.

## Security / Legal Flags

Record any security, privacy, legal, or compliance issues discovered during research, for example:

- Areas requiring threat modeling or penetration testing.
- Data classifications and access constraints.
- Notification consent and opt-out requirements.
- Legal text or policies that must be reviewed or approved.

Use bullets. If any flag blocks release, say so explicitly.

## Competitor Notes

Provide a concise view of how competitor or market research influenced this package:

- Relevant competitor capabilities or gaps.
- Differentiating features this package aims to deliver.
- Areas where parity is required.
- Demand signals that justify the initiative.

Do not restate the entire market brief; link to it and surface only the pieces that matter for this package.

## Open Questions

List unresolved questions or decisions that must be answered before build or release, such as:

- Missing business rules or formulas.
- Undecided architecture or integration choices.
- Legal wording that needs counsel approval.
- Security controls or monitoring that still need design.

Each open question should indicate likely ownership or next step where possible.

## Links

Provide direct links or paths to supporting artifacts, for example:

- Full research specification document.
- Source plans and strategy notes.
- Market or competitive landscape brief.
- Relevant code repositories or folders.
- Decision summaries or approvals.

Use Obsidian wiki links where appropriate or plain repo paths if needed.

## Usage Notes

- This template is global and should not be edited inside project-specific notes; instead, copy it and then fill the copy.
- Each completed research package should have:
  - A full spec document following the Research Lane Standard Template.
  - An Obsidian note using this template as its cover and index.
- The Obsidian note is the entry point; it should make it easy for Command, Build, Legal, and Security to find the deeper artifacts without re-reading everything.
