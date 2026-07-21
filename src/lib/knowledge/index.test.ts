import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Structural guard for the knowledge-layer import boundary (see the POLICY
 * FENCE comment in ./taskTimeResearch.ts and the barrel comment in
 * ./index.ts): Chief/Build surfaces that use task-time research state must
 * import it from the sanctioned "@/lib/knowledge/index" barrel, never by
 * reaching into ./latestResearchSource (raw glob-backed summaries) or
 * ./taskTimeResearch (the pure gate) directly.
 *
 * This reads source files as plain text rather than importing them, because
 * the barrel (and latestResearchSource.ts) use Vite-only `import.meta.glob`,
 * which crashes under the plain `tsx --test` runner this suite runs under —
 * the same reason taskTimeResearch.ts itself has no import-time dependency
 * on that module. A text check is the only way to assert this from a test
 * that must stay runnable outside Vite.
 */

const FORBIDDEN_IMPORT_PATTERN = /from\s+["']@\/lib\/knowledge\/(latestResearchSource|taskTimeResearch)(\.js)?["']/;
const SANCTIONED_IMPORT_PATTERN = /from\s+["']@\/lib\/knowledge\/index["']/;

// Every Chief/Build surface known to consume task-time research state today.
// Add a path here whenever a new surface is wired to research — the point of
// this test is that the list (and the guard) stays current, not exhaustive
// by accident.
const RESEARCH_CONSUMING_SURFACES = [
  "src/components/chief/AgentWorkBoard.tsx",
  "src/components/chief/ChiefHomePanel.tsx",
  "src/components/chief/chiefGovernanceEvents.ts",
];

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

test("Chief/Build research-consuming surfaces import only from the sanctioned @/lib/knowledge barrel", () => {
  for (const relativePath of RESEARCH_CONSUMING_SURFACES) {
    const source = readSource(relativePath);
    assert.doesNotMatch(
      source,
      FORBIDDEN_IMPORT_PATTERN,
      `${relativePath} must not import research state directly from latestResearchSource or ` +
        `taskTimeResearch — go through "@/lib/knowledge/index" instead`,
    );
    assert.match(
      source,
      SANCTIONED_IMPORT_PATTERN,
      `${relativePath} is expected to consume task-time research via "@/lib/knowledge/index" ` +
        `— if it no longer does, update RESEARCH_CONSUMING_SURFACES above`,
    );
  }
});

test("the barrel (index.ts) is the only file allowed to import latestResearchSource or taskTimeResearch by value", () => {
  const knowledgeDir = path.resolve(process.cwd(), "src/lib/knowledge");
  const files = fs
    .readdirSync(knowledgeDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && name !== "index.ts");

  for (const name of files) {
    if (name === "latestResearchSource.ts" || name === "taskTimeResearch.ts") continue;
    const source = fs.readFileSync(path.join(knowledgeDir, name), "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["']\.\/(latestResearchSource|taskTimeResearch)(\.js)?["']/,
      `${name} should not import latestResearchSource/taskTimeResearch directly — only index.ts (the barrel) does`,
    );
  }
});
