#!/usr/bin/env node
import { runBuildPlanHelper } from "../lib/chief/buildPlanHelper.js";

/**
 * ADVISORY ONLY. This script never writes to the repo, never opens a PR,
 * never triggers a deploy, and never submits an ApprovalCard. It prints a
 * suggestion for a human to read and a draft BuildApprovalRequest for a
 * human to copy into src/components/chief/agentApprovalGates.ts by hand,
 * only if they agree with it. That manual copy step is the approval gate.
 */

function usage(): string {
  return `Build Plan Helper (advisory only)

Reuses Chief's existing AI fallback (lib/chief/modelRouter.ts) to suggest an
implementation plan for a small, scoped Builder task, and drafts a
BuildApprovalRequest shape for you to review — nothing is submitted
automatically.

Usage:
  npm run build:plan-helper -- --prompt "<short scoped task description>" [--local-only]

Notes:
  - Works with no AI fallback configured: prints a draft approval-request
    skeleton from your prompt alone (CHIEF_AI_FALLBACK_ENABLED and
    CHIEF_OLLAMA_FALLBACK_ENABLED are both off by default).
  - --local-only skips Azure and tries only local Ollama, same as Chief's
    "Prefer local only" toggle.
  - Does not use, change, or add any model beyond what modelRouter.ts
    already routes to.
`;
}

function parseArgs(argv: string[]): { prompt: string; localOnly: boolean } {
  let prompt: string | undefined;
  let localOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--prompt") {
      prompt = argv[i + 1];
      i += 1;
    } else if (token === "--local-only") {
      localOnly = true;
    }
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("--prompt is required");
  }

  return { prompt, localOnly };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    console.log(usage());
    return;
  }

  const { prompt, localOnly } = parseArgs(argv);
  const result = await runBuildPlanHelper(prompt, { localOnly });

  console.log("=".repeat(72));
  console.log("BUILD PLAN HELPER — ADVISORY OUTPUT ONLY");
  console.log("No repo changes made. No PR opened. No deploy triggered.");
  console.log("=".repeat(72));
  console.log(`\nPrompt: ${result.prompt}\n`);

  if (result.advisory) {
    console.log(`AI suggestion (${result.advisory.source}/${result.advisory.model}):`);
    console.log(result.advisory.summary);
  } else {
    console.log(
      "No AI fallback tier is configured/reachable right now — " +
        "the draft below is built from your prompt alone.",
    );
  }

  console.log("\n" + "-".repeat(72));
  console.log("DRAFT BuildApprovalRequest (NOT submitted — review and copy by hand):");
  console.log("-".repeat(72));
  console.log(JSON.stringify(result.draft, null, 2));
  console.log(
    "\nTo act on this: implement the real change, run npm run qa, fill in " +
      "filesOrAreas, then add this as a real BuildApprovalRequest in " +
      "src/components/chief/agentApprovalGates.ts yourself — Chief still " +
      "routes it through the normal Approve/Send back/Reject card, same as " +
      "every other Build request.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("\n" + usage());
  process.exitCode = 1;
});
