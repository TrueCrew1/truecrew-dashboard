import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listVaultNotes, readVaultNote } from "./read.js";
import { renderDecisionNote, renderMaintenanceNote } from "./templates.js";

const LOGGED_AT = new Date("2026-07-08T00:00:00.000Z");

async function makeTempVault(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "obsidian-vault-"));
}

async function writeNote(vaultPath: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(vaultPath, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
}

describe("maintenance note type inference (PR #96 read/write mismatch fix)", () => {
  let vaultPath: string | undefined;

  afterEach(async () => {
    if (vaultPath) await fs.rm(vaultPath, { recursive: true, force: true });
    vaultPath = undefined;
  });

  it("reads a maintenance note back as type maintenance via explicit frontmatter, not decision", async () => {
    vaultPath = await makeTempVault();
    const relativePath = "Operations/Maintenance/2026-07-08 — Replace HVAC filter.md";
    await writeNote(
      vaultPath,
      relativePath,
      renderMaintenanceNote({
        title: "Replace HVAC filter",
        description: "Filter is past its service interval.",
        loggedAt: LOGGED_AT,
      }),
    );

    const note = await readVaultNote(vaultPath, relativePath);

    expect(note?.type).toBe("maintenance");
  });

  it("falls back to type maintenance for an untyped note under Operations/Maintenance/", async () => {
    vaultPath = await makeTempVault();
    const relativePath = "Operations/Maintenance/2026-07-08 — Untyped note.md";
    await writeNote(vaultPath, relativePath, "# Untyped note\n\nNo frontmatter type here.\n");

    const note = await readVaultNote(vaultPath, relativePath);

    expect(note?.type).toBe("maintenance");
  });

  it("still resolves an untyped note under Decisions/ as decision (regression check)", async () => {
    vaultPath = await makeTempVault();
    const relativePath = "Decisions/2026-07-08 — Some decision.md";
    await writeNote(vaultPath, relativePath, "# Some decision\n\nNo frontmatter type here.\n");

    const note = await readVaultNote(vaultPath, relativePath);

    expect(note?.type).toBe("decision");
  });

  it("lists a maintenance note and a decision note with their correct, distinct types", async () => {
    vaultPath = await makeTempVault();

    const maintenancePath = "Operations/Maintenance/2026-07-08 — Replace HVAC filter.md";
    await writeNote(
      vaultPath,
      maintenancePath,
      renderMaintenanceNote({
        title: "Replace HVAC filter",
        description: "Filter is past its service interval.",
        loggedAt: LOGGED_AT,
      }),
    );

    const decisionPath = "Decisions/2026-07-08 — Keep vendor.md";
    await writeNote(
      vaultPath,
      decisionPath,
      renderDecisionNote({
        title: "Keep vendor",
        decision: "Stay with current HVAC vendor.",
        loggedAt: LOGGED_AT,
      }),
    );

    const notes = await listVaultNotes(vaultPath);
    const types = Object.fromEntries(notes.map((n) => [n.obsidianPath, n.type]));

    expect(types[maintenancePath]).toBe("maintenance");
    expect(types[decisionPath]).toBe("decision");
  });
});
