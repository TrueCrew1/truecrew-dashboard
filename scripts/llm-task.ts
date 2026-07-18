#!/usr/bin/env npx tsx
/**
 * LLM Task CLI — call the router from command line
 *
 * Usage:
 *   npm run llm -- <lane> <complexity> <prompt...>
 *   npx tsx scripts/llm-task.ts research low "List three options for X"
 *
 * Lanes: research, builder, chief
 * Complexity: low, medium, high
 *
 * Examples:
 *   npm run llm -- research low "List three options for X with pros/cons"
 *   npm run llm -- builder medium "Suggest edge-case tests for stableChiefId()"
 *   npm run llm -- chief low "Tighten these bullets: <paste bullets>"
 */

import { runTask, describeRouting, type Lane, type Complexity } from "../src/llm/router";

const VALID_LANES: Lane[] = ["research", "builder", "chief"];
const VALID_COMPLEXITIES: Complexity[] = ["low", "medium", "high"];

function printUsage(): void {
  console.log(`
Usage: npm run llm -- <lane> <complexity> <prompt...>

Lanes:
  research  — knowledge-building, filing to knowledge/
  builder   — tests, small refactors, code analysis
  chief     — governance wording, summaries, decisions

Complexity:
  low       — quick, cheap (DeepSeek default)
  medium    — moderate reasoning
  high      — careful reasoning, long context

Examples:
  npm run llm -- research low "List three options for X"
  npm run llm -- builder medium "Suggest edge-case tests for fn()"
  npm run llm -- chief high "Review this decision for risks: <paste>"

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

  if (!laneArg || !complexityArg || promptParts.length === 0) {
    console.error("Error: Missing required arguments.\n");
    printUsage();
    process.exit(1);
  }

  const lane = laneArg as Lane;
  const complexity = complexityArg as Complexity;
  const prompt = promptParts.join(" ");

  if (!VALID_LANES.includes(lane)) {
    console.error(`Error: Invalid lane "${lane}". Valid lanes: ${VALID_LANES.join(", ")}`);
    process.exit(1);
  }

  if (!VALID_COMPLEXITIES.includes(complexity)) {
    console.error(
      `Error: Invalid complexity "${complexity}". Valid: ${VALID_COMPLEXITIES.join(", ")}`
    );
    process.exit(1);
  }

  console.log(`\n--- LLM Task ---`);
  console.log(`Lane: ${lane}`);
  console.log(`Complexity: ${complexity}`);
  console.log(`Prompt: ${prompt.substring(0, 80)}${prompt.length > 80 ? "..." : ""}`);
  console.log(`---\n`);

  try {
    const result = await runTask({ lane, complexity, prompt });
    console.log("\n--- Response ---");
    console.log(result);
    console.log("---\n");
  } catch (error) {
    console.error("\nLLM task failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
