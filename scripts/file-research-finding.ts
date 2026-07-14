#!/usr/bin/env node
import { fileResearchFinding, type ResearchFinding } from "../lib/research/fileFinding";

/**
 * Bounded example finding standing in for a Research agent's structured output —
 * not AI-generated, and true/checkable against this repo as of this session.
 */
const EXAMPLE_FINDING: ResearchFinding = {
  topic: "Research agent filing loop — first real pass",
  origin:
    "Chief/Planner stand-up session on claude/chief-planner-verify-jba89n — bootstrapping the " +
    "Research to Filing path under Chief.",
  summary:
    "The repo had no working Research to Filing loop yet: Research only existed as an " +
    "illustrative approval-request example in agentApprovalGates.ts. knowledge/sources/ is the " +
    "existing, correctly-scoped shelf for raw findings before synthesis into concepts/projects/decisions.",
  facts: [
    "knowledge/sources/ already defines a source-template.md with title/type/status/created/updated/related_pages/related_prs/related_cards frontmatter.",
    "No knowledge/research/ shelf exists in the repo; sources/ is the closest and correctly-scoped destination for raw findings.",
    "lib/librarian/'s existing filing code writes into an external, configurable Obsidian vault path — not this repo's own knowledge/ directory.",
  ],
  nextStep: "Fold into knowledge/concepts/second-brain-workflow.md once a real Research agent run needs this pattern.",
};

const writtenPath = fileResearchFinding(EXAMPLE_FINDING);
console.log(`Wrote ${writtenPath}`);
