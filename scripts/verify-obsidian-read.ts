#!/usr/bin/env npx tsx
/**
 * Local verification for Obsidian vault read utilities and API response shape.
 * Uses a temporary fixture vault — no live iCloud path required.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "../api/obsidian/notes";
import { resolveVaultAccess } from "../lib/obsidian/access";
import {
  listVaultNotes,
  readVaultNote,
  resolveVaultReadPath,
} from "../lib/obsidian/read";
import {
  obsidianNotesErrorResponse,
  obsidianNotesListResponse,
} from "../lib/obsidian/responses";

const FIXTURE_NOTES = {
  "Decisions/2026-06-30 — Obsidian read path.md": `---
title: Obsidian read path
type: decision
summary: Verify local vault reads for the dashboard.
---
Decision to ship the read API with predictable JSON.`,
  "Operations/Logs/Build Log.md": `# Build Log

## 2026-06-30 — verify-obsidian-read
- result: success`,
  "04_INCIDENTS/*.md": `---
title: "*"
type: incident
---
Template placeholder — not a real note.`,
} as const;

async function createFixtureVault(root: string): Promise<void> {
  for (const [relativePath, content] of Object.entries(FIXTURE_NOTES)) {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function invokeNotesHandler(
  query: Record<string, string | string[] | undefined> = {},
  method = "GET",
): Promise<{ status: number; body: Record<string, unknown> }> {
  let status = 200;
  let payload: Record<string, unknown> = {};

  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(body: Record<string, unknown>) {
      payload = body;
      return res;
    },
    setHeader() {
      return res;
    },
  } as unknown as VercelResponse;

  await handler({ method, query } as VercelRequest, res);
  return { status, body: payload };
}

async function main(): Promise<void> {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tc-obsidian-read-"));

  try {
    await createFixtureVault(fixtureRoot);

    process.env.OBSIDIAN_VAULT_PATH = fixtureRoot;

    const access = await resolveVaultAccess();
    assert(access.kind === "ready", `expected ready vault, got ${access.kind}`);
    assert(access.path === fixtureRoot, "resolved vault path mismatch");

    const notes = await listVaultNotes(fixtureRoot);
    assert(notes.length === 2, `expected 2 notes, got ${notes.length}`);
    assert(
      !notes.some((note) => note.obsidianPath === "04_INCIDENTS/*.md"),
      "glob placeholder note should be excluded",
    );
    assert(
      notes.some((note) => note.obsidianPath === "Decisions/2026-06-30 — Obsidian read path.md"),
      "decision note missing from list",
    );

    const detail = await readVaultNote(
      fixtureRoot,
      "Decisions/2026-06-30 — Obsidian read path.md",
    );
    assert(detail !== null, "expected note detail");
    assert(detail.title === "Obsidian read path", "frontmatter title not parsed");
    assert(detail.type === "decision", "note type not inferred");
    assert(detail.content.includes("Decision to ship"), "note body missing");

    const missing = await readVaultNote(fixtureRoot, "Decisions/does-not-exist.md");
    assert(missing === null, "missing note should return null");

    let traversalFailed = false;
    try {
      resolveVaultReadPath(fixtureRoot, "../../etc/passwd");
    } catch (error) {
      traversalFailed =
        error instanceof Error && error.message.includes("outside vault");
    }
    assert(traversalFailed, "path traversal should be rejected");

    let nonMarkdownFailed = false;
    try {
      resolveVaultReadPath(fixtureRoot, "Operations/Logs");
    } catch (error) {
      nonMarkdownFailed =
        error instanceof Error && error.message.includes("Only .md notes");
    }
    assert(nonMarkdownFailed, "non-.md paths should be rejected");

    const listPayload = obsidianNotesListResponse(notes);
    assert(listPayload.ok === true, "list payload ok flag");
    assert(listPayload.configured === true, "list payload configured flag");
    assert(listPayload.count === notes.length, "list payload count");

    const missingAccess = await resolveVaultAccess();
    assert(missingAccess.kind === "ready", "fixture vault should still resolve");

    process.env.OBSIDIAN_VAULT_PATH = path.join(fixtureRoot, "missing-vault");
    const notFoundAccess = await resolveVaultAccess();
    assert(notFoundAccess.kind === "missing", "missing vault should report missing");
    if (notFoundAccess.kind !== "missing") {
      throw new Error("unexpected access state");
    }
    assert(
      obsidianNotesErrorResponse(false, notFoundAccess.error).configured === false,
      "unconfigured error payload",
    );

    process.env.OBSIDIAN_VAULT_PATH = fixtureRoot;

    const listRoute = await invokeNotesHandler();
    assert(listRoute.status === 200, `list route expected 200, got ${listRoute.status}`);
    assert(listRoute.body.ok === true, "list route ok flag");
    assert(Array.isArray(listRoute.body.notes), "list route notes array");
    assert(listRoute.body.count === 2, "list route count");

    const readRoute = await invokeNotesHandler({
      path: "Decisions/2026-06-30 — Obsidian read path.md",
    });
    assert(readRoute.status === 200, `read route expected 200, got ${readRoute.status}`);
    assert(readRoute.body.ok === true, "read route ok flag");
    assert(typeof readRoute.body.note === "object", "read route note object");

    const missingRoute = await invokeNotesHandler({ path: "Decisions/missing.md" });
    assert(missingRoute.status === 404, `missing note expected 404, got ${missingRoute.status}`);
    assert(missingRoute.body.ok === false, "missing note ok flag");
    assert(missingRoute.body.configured === true, "missing note still configured");

    const traversalRoute = await invokeNotesHandler({ path: "../../etc/passwd" });
    assert(traversalRoute.status === 400, `traversal expected 400, got ${traversalRoute.status}`);

    const methodRoute = await invokeNotesHandler({}, "POST");
    assert(methodRoute.status === 405, `POST expected 405, got ${methodRoute.status}`);

    process.env.OBSIDIAN_VAULT_PATH = path.join(fixtureRoot, "missing-vault");
    const unconfiguredRoute = await invokeNotesHandler();
    assert(
      unconfiguredRoute.status === 503,
      `unconfigured expected 503, got ${unconfiguredRoute.status}`,
    );
    assert(unconfiguredRoute.body.configured === false, "unconfigured flag");

    process.env.OBSIDIAN_VAULT_PATH = fixtureRoot;
    console.log("Obsidian read verification passed.");
    console.log(`  fixture vault: ${fixtureRoot}`);
    console.log(`  notes listed: ${notes.length}`);
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Obsidian read verification failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
