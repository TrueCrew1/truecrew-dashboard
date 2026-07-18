#!/usr/bin/env npx tsx
/**
 * LLM Task CLI
 *
 * Usage:
 *   npm run llm -- <lane> <complexity> "<prompt...>"
 *   npm run llm -- --help
 *   npm run llm -- --routing
 */

import { runTask, describeRouting, type Lane, type Complexity } from "../src/llm";

const VALID_LANES: Lane[] = ["research", "builder", "chief"];
const VALID_COMPLEXITIES: Complexity[] = ["low", "medium", "high"];

function printUsage(): void {
  console.log(`
Usage: npm run llm -- <lane> <complexity> "<prompt...>"

Lanes:
  research  — knowledge-building (default)
  builder   — tests, refactors, code analysis
  chief     — governance wording, summaries

Complexity:
  low       — quick, cheap (default)
  medium    — moderate reasoning
  high      — careful reasoning, long context

Examples:
  npm run llm -- research low "List options for X"
  npm run llm -- builder medium "Suggest tests for fn()"
  npm run llm -- chief high "Review this decision"

${describeRouting()}
  `.trim());
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (args.includes("--routing")) {
    console.log(describeRouting());
    process.exit(0);
  }

  const [laneArg, complexityArg, ...promptParts] = args;

  const lane: Lane = VALID_LANES.includes(laneArg as Lane)
    ? (laneArg as Lane)
    : "research";

  const complexity: Complexity = VALID_COMPLEXITIES.includes(complexityArg as Complexity)
    ? (complexityArg as Complexity)
    : "low";

  // If lane/complexity weren't valid, they're part of the prompt
  let prompt: string;
  if (!VALID_LANES.includes(laneArg as Lane)) {
    prompt = [laneArg, complexityArg, ...promptParts].filter(Boolean).join(" ");
  } else if (!VALID_COMPLEXITIES.includes(complexityArg as Complexity)) {
    prompt = [complexityArg, ...promptParts].filter(Boolean).join(" ");
  } else {
    prompt = promptParts.join(" ");
  }

  if (!prompt) {
    console.error("Error: No prompt provided.\n");
    printUsage();
    process.exit(1);
  }

  try {
    const response = await runTask({ lane, complexity, prompt });
    console.log(response.text);
  } catch (error) {
    console.error(
      "LLM task failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
