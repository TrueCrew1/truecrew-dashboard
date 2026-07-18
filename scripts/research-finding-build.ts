#!/usr/bin/env node
/**
 * Research Finding payload builder CLI.
 *
 * Reads a small JSON stub of explicit fields (date, question, sources, evidence,
 * tier, category), builds a validated ResearchFindingPayload via the pure helper,
 * and writes the payload JSON to a chosen path — ready for the Filing dry-run:
 *   npm run obsidian:log -- research-finding --file <out>
 *
 * Writes only the payload file the operator names. No vault/Supabase writes.
 *
 * Usage:
 *   npm run research:finding:build -- --config <stub.json> --out <payload.json>
 *   (--file is accepted as an alias for --out)
 */
import fs from "node:fs/promises";
import {
  buildAndValidateFinding,
  type BuildFindingInput,
} from "../lib/research/buildFindingPayload";

function readFlag(argv: string[], ...names: string[]): string | undefined {
  for (const name of names) {
    const index = argv.indexOf(name);
    if (index >= 0) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
      return value;
    }
  }
  return undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(
      "Usage: npm run research:finding:build -- --config <stub.json> --out <payload.json>",
    );
    return;
  }

  const configPath = readFlag(argv, "--config", "--in");
  const outPath = readFlag(argv, "--out", "--file");
  if (!configPath) throw new Error("--config <path> to an input stub JSON is required");
  if (!outPath) throw new Error("--out <path> (or --file) for the payload JSON is required");

  const rawConfig = await fs.readFile(configPath, "utf8");
  let input: BuildFindingInput;
  try {
    input = JSON.parse(rawConfig) as BuildFindingInput;
  } catch {
    throw new Error(`Could not parse input stub JSON at ${configPath}`);
  }

  const { payload, validation } = buildAndValidateFinding(input);
  if (!validation.ok) {
    console.error("Built payload is invalid:");
    for (const error of validation.errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote Research Finding payload → ${outPath}`);
  console.log(`  tier:     ${payload.tier}`);
  if (payload.title) console.log(`  title:    ${payload.title}`);
  if (payload.category) console.log(`  category: ${payload.category}`);
  console.log(`Next: npm run obsidian:log -- research-finding --file ${outPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
