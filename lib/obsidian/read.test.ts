import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listVaultNotes, readVaultNote } from "./read.js";
import { renderMaintenanceNote } from "../maintenance/templates.js";
import { renderTaskArtifactNote } from "../librarian/templates.js";
import type { Task } from "../../src/types";
import type { ArtifactDraft } from "../librarian/types.js";

let vaultDir: string;

beforeEach(async () => {
  vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), "obsidian-read-test-"));
});

afterEach(async () => {
  await fs.rm(vaultDir, { recursive: true, force: true });
});

async function writeNote(relativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(vaultDir, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
}

const BASE_TASK: Task = {
  id: "task-1",
  title: "Test task",
  description: "A task",
  stage: "Done",
  workflowType: "repair",
  priority: "high",
  assignee: null,
  dueAt: null,
  blocker: null,
  githubRef: null,
  gates: [],
} as unknown as Task;

describe("vault note type recognition (#97/#98 taxonomy)", () => {
  it("recognizes an explicit frontmatter type: maintenance", async () => {
    await writeNote(
      "Somewhere/note.md",
      "---\ntype: maintenance\nagent: maintenance\n---\n\nBody\n",
    );

    const notes = await listVaultNotes(vaultDir);

    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("maintenance");
  });

  it("falls back to 'maintenance' (not 'decision') for Operations/Maintenance/ notes lacking a recognized frontmatter type", async () => {
    await writeNote(
      "Operations/Maintenance/2026-07-08 — Replace HVAC filter.md",
      "---\nsource: true-crew\n---\n\nBody with no type field\n",
    );

    const notes = await listVaultNotes(vaultDir);

    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("maintenance");
  });

  it("classifies a real renderMaintenanceNote() output as 'maintenance', matching what create.ts writes to the vault", async () => {
    const targetPath = "Operations/Maintenance/2026-07-08 — Replace HVAC filter.md";
    const markdown = renderMaintenanceNote(BASE_TASK, targetPath);
    await writeNote(targetPath, markdown);

    const note = await readVaultNote(vaultDir, targetPath);

    expect(note).not.toBeNull();
    expect(note?.type).toBe("maintenance");
  });

  it("still falls back to 'decision' for untyped notes under Decisions/ (unchanged pre-existing behavior)", async () => {
    await writeNote("Decisions/2026-07-08 — Some choice.md", "No frontmatter type here\n");

    const notes = await listVaultNotes(vaultDir);

    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("decision");
  });

  it("continues to recognize every Librarian NoteCategory from frontmatter unchanged (DB/vault consistency for Librarian)", async () => {
    const noteCategories = ["build", "deploy", "incident", "ticket", "decision", "onboarding"] as const;

    for (const noteType of noteCategories) {
      const draft: ArtifactDraft = {
        title: `Artifact ${noteType}`,
        summary: "Summary",
        tags: ["librarian"],
        pathSegment: `artifact-${noteType}`,
        noteType,
      };
      const targetPath = `Operations/Artifacts/artifact-${noteType}.md`;
      const markdown = renderTaskArtifactNote(BASE_TASK, draft, targetPath, "deterministic");
      await writeNote(targetPath, markdown);
    }

    const notes = await listVaultNotes(vaultDir);
    const byPath = new Map(notes.map((note) => [note.obsidianPath, note]));

    for (const noteType of noteCategories) {
      const note = byPath.get(`Operations/Artifacts/artifact-${noteType}.md`);
      expect(note?.type).toBe(noteType);
    }
  });
});
