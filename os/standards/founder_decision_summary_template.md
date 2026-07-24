---
title: "Founder Decision Summary Template"
status: "template"
type: "decision-standard"
scope: "global"
owner: "Command Center"
tags:
  - standards
  - template
  - decision
  - command-center
---

# Founder Decision Summary Template

This template is used **after a completed research package exists** so founders or leadership can make evidence-based prioritization and sequencing decisions. It prevents assigning priorities or selecting first implementation slices without source-traceable findings, dependencies, risks, and acceptance criteria.

## When to Use

Use this template only when:

- A builder-ready research package has been completed for a specific initiative or slice.
- Initiative scope, findings, dependencies, costs, risks, and acceptance criteria are documented.
- Security, legal, and operational flags have been surfaced at the research level.

If no research package exists, this template should still be used — but the decision status must remain **Blocked** and the note must state clearly why.

---

## Founder Decision Summary

**Decision status:** `<Blocked|Approved|Deferred|Rejected>`  

**Guidance:**

- If a completed research package exists, summarize the decision and reference that package explicitly.
- If no research package exists, set status to `Blocked` and use the following pattern:

> Decision status: Blocked pending the research package.  
> A defensible priority decision cannot be made without initiative findings, dependencies, costs, acceptance criteria, security and legal flags, and open questions.

**Next action (when blocked):**  
Describe the required research action, for example:

- “Paste or link the completed research package for this initiative.”
- “Complete the M&S Painting V2 research package for [initiative name].”

---

## Prioritized Sequence

Priority assignments should be filled **only after** source review. Use this table to record the decision:

| Priority | Status        | Required evidence                                                   |
|---------|---------------|---------------------------------------------------------------------|
| P0      | `<status>`    | Critical repairs, security exposure, operational blockers, dependencies, and release gates |
| P1      | `<status>`    | Near-term customer or revenue value, implementation effort, and prerequisite completion     |
| P2      | `<status>`    | Lower-urgency enhancements, advanced capabilities, and deferrable optimization              |

**Guidance:**

- P0: Work that protects trust, reliability, security, and operability.  
- P1: Work that delivers near-term value with acceptable risk.  
- P2: Improvements that are valuable but safely deferrable.

---

## Top Risks and Mitigations

Use this table to record the most important risks discovered and how they will be addressed:

| Risk                                         | Mitigation                                                       |
|----------------------------------------------|------------------------------------------------------------------|
| Priorities are chosen without evidence       | Review the completed research package before sequencing work     |
| Hidden dependencies cause rework             | Map technical, data, security, and integration dependencies      |
| Critical reliability or security issues are deferred | Identify release-blocking defects and exposures before feature work |
| Scope expands across multiple initiatives    | Select one bounded slice with explicit acceptance criteria       |
| Value cannot be verified                     | Define a measurable outcome and verification method for each priority |

Add or modify rows to match the specific initiative. The examples above are common baseline risks.

---

## Recommended First Slice

Use this section to choose and justify the **first implementation slice**, or to explicitly defer the choice if still blocked.

**Example pattern when blocked:**

> Recommended first slice: Obtain and review the completed research package.  
> The first implementation slice should be selected only after confirming:
> - the highest-severity reliability and security issues  
> - shared technical and data dependencies  
> - near-term customer and revenue impact  
> - implementation effort and reversibility  
> - concrete acceptance criteria  
> - security, legal, and operational release gates  

**When research exists:**

- Name the slice (e.g., “Repair + security baseline,” “Core V2 estimating engine formulas”).
- Describe why it was chosen:
  - Impact vs effort.
  - Risk reduction.
  - Dependencies cleared.
  - Ability to verify value quickly.

---

## Usage Notes

- This document is a **global standard** and belongs in the OS and Obsidian standards folders.
- For each initiative or slice, Command should:
  - Copy this template into a project-specific decision note (for example, under `Research/Projects/M-and-S-Painting/Decisions/`).
  - Fill in the status, priority table, risks, and first slice based on the completed research package.
- If research is incomplete or missing, keep the decision status **Blocked** and explicitly state which evidence is missing.
- This template does not replace the research package; it summarizes the decision layer that sits on top of research.
