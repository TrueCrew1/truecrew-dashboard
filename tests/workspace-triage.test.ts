import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { classifyFile } from "../lib/workspace/classify";
import { upsertPathEnvLocal } from "../lib/workspace/env-local";
import { assertDeleteAllowed, assertMoveAllowed } from "../lib/workspace/permissions";
import { moveWithinWorkspace } from "../lib/workspace/move";
import { setupWorkspace } from "../lib/workspace/setup";
import { runTriage } from "../lib/workspace/triage";
import {
  createSourceNote,
  titleFromFilename,
  topicTitle,
} from "../lib/workspace/second-brain";
import { renderTriageLogSection, renderSheetRow } from "../lib/workspace/log";
import type { TriageLogEntry } from "../lib/workspace/types";

let workspaceDir: string;
let vaultDir: string;

beforeEach(async () => {
  workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "truecrew-ws-"));
  vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), "truecrew-vault-"));
  process.env.TRUECREW_WORKSPACE_PATH = workspaceDir;
  process.env.OBSIDIAN_VAULT_PATH = vaultDir;
  await setupWorkspace(workspaceDir);
});

afterEach(async () => {
  delete process.env.TRUECREW_WORKSPACE_PATH;
  delete process.env.OBSIDIAN_VAULT_PATH;
  await fs.rm(workspaceDir, { recursive: true, force: true });
  await fs.rm(vaultDir, { recursive: true, force: true });
});

async function dropInboxFile(name: string, body = "hello"): Promise<string> {
  const filePath = path.join(workspaceDir, "00-Inbox-Downloads", name);
  await fs.writeFile(filePath, body, "utf8");
  return filePath;
}

describe("classifyFile", () => {
  it("sends junk to delete-candidates with high confidence", () => {
    const result = classifyFile("/tmp/.DS_Store");
    expect(result.bucket).toBe("delete-candidates");
    expect(result.destinationFolder).toBe("05-Delete-Candidates");
    expect(result.confidence).toBe("high");
  });

  it("queues PDFs as research", () => {
    const result = classifyFile("/tmp/competitor-brief.pdf");
    expect(result.bucket).toBe("research");
    expect(result.createSourceNote).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("treats note-shaped markdown as second-brain", () => {
    const result = classifyFile("/tmp/meeting-notes-field-ops.md");
    expect(result.bucket).toBe("second-brain");
    expect(result.theme).toBe("field-ops");
  });

  it("defaults unclear files to needs-review with low confidence", () => {
    const result = classifyFile("/tmp/photo123.heic");
    expect(result.bucket).toBe("needs-review");
    expect(result.createSourceNote).toBe(false);
    expect(result.confidence).toBe("low");
  });
});

describe("permissions", () => {
  it("allows moves into approved folders only", () => {
    expect(() => assertMoveAllowed("02-Research-Queue")).not.toThrow();
    expect(() => assertMoveAllowed("00-Inbox-Downloads")).toThrow(/Permission denied/);
  });

  it("blocks permanent delete outside Delete-Candidates", () => {
    expect(() => assertDeleteAllowed("05-Delete-Candidates")).not.toThrow();
    expect(() => assertDeleteAllowed("04-Archive")).toThrow(/Permission denied/);
  });
});

describe("setupWorkspace", () => {
  it("creates intake folders, permissions, CSV, and vault layout under Drive tree", async () => {
    await expect(
      fs.access(path.join(workspaceDir, "BOT_PERMISSIONS.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(workspaceDir, "03-Second-Brain", "Triage-Log.csv")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(
        path.join(
          workspaceDir,
          "Obsidian Vaults",
          "TrueCrew Second Brain",
          "Questions",
        ),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("upsertPathEnvLocal", () => {
  it("writes only path keys and leaves other lines alone", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "truecrew-env-"));
    const envPath = path.join(repo, ".env.local");
    await fs.writeFile(
      envPath,
      'INTERNAL_API_SECRET=keep-me-secret\nTRUECREW_WORKSPACE_PATH="/old"\n',
      "utf8",
    );

    const result = upsertPathEnvLocal(repo, {
      workspacePath: "/Users/truecrew/Google Drive/TrueCrew",
      vaultPath:
        "/Users/truecrew/Google Drive/TrueCrew/Obsidian Vaults/TrueCrew Second Brain",
    });

    const body = await fs.readFile(result.envPath, "utf8");
    expect(body).toContain("INTERNAL_API_SECRET=keep-me-secret");
    expect(body).toContain(
      'TRUECREW_WORKSPACE_PATH="/Users/truecrew/Google Drive/TrueCrew"',
    );
    expect(body).toContain("OBSIDIAN_VAULT_PATH=");
    expect(body).not.toContain("/old");

    await fs.rm(repo, { recursive: true, force: true });
  });
});

describe("moveWithinWorkspace", () => {
  it("moves a file and renames on collision", async () => {
    const source = await dropInboxFile("report.pdf", "a");
    await fs.writeFile(
      path.join(workspaceDir, "02-Research-Queue", "report.pdf"),
      "existing",
      "utf8",
    );

    const result = await moveWithinWorkspace(
      workspaceDir,
      source,
      "02-Research-Queue",
    );

    expect(result.renamed).toBe(true);
    expect(result.finalFilename).toBe("report (2).pdf");
    await expect(fs.access(result.destinationPath)).resolves.toBeUndefined();
  });
});

describe("runTriage", () => {
  it("classifies, moves, logs CSV, and creates a Sources note", async () => {
    await dropInboxFile("field-ops-research.pdf", "%PDF research");
    await dropInboxFile(".DS_Store", "");

    const result = await runTriage();

    expect(result.processed).toBe(2);
    expect(result.moved).toBe(2);
    expect(result.dryRun).toBe(false);

    await expect(
      fs.access(path.join(workspaceDir, "02-Research-Queue", "field-ops-research.pdf")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(workspaceDir, "05-Delete-Candidates", ".DS_Store")),
    ).resolves.toBeUndefined();

    const sheet = await fs.readFile(
      path.join(workspaceDir, "03-Second-Brain", "Triage-Log.csv"),
      "utf8",
    );
    expect(sheet).toContain("field-ops-research.pdf");
    expect(sheet).toContain("delete-candidates");
    expect(sheet).toContain("confidence");

    const sourceNote = path.join(vaultDir, "Sources", "field-ops-research.md");
    await expect(fs.access(sourceNote)).resolves.toBeUndefined();
    const sourceBody = await fs.readFile(sourceNote, "utf8");
    expect(sourceBody).toContain("## Short summary");
    expect(sourceBody).toContain("## Key points");
    expect(sourceBody).toContain("[[Topic — Field Ops]]");

    expect(result.topicNotesCreated.length).toBeGreaterThanOrEqual(1);
  });

  it("dry-run does not move files or write notes", async () => {
    await dropInboxFile("keep-me.md", "notes");
    const result = await runTriage({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.moved).toBe(0);
    await expect(
      fs.access(path.join(workspaceDir, "00-Inbox-Downloads", "keep-me.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(vaultDir, "Sources", "keep-me.md")),
    ).rejects.toThrow();
  });

  it("drafts a synthesis when a theme has enough sources", async () => {
    await dropInboxFile("field-ops-a.md", "a");
    await dropInboxFile("field-ops-b.md", "b");

    const result = await runTriage();

    expect(result.synthesisNotesCreated.some((p) => p.includes("Synthesis"))).toBe(
      true,
    );
    await expect(
      fs.access(path.join(vaultDir, "Synthesis", "Synthesis — Field Ops.md")),
    ).resolves.toBeUndefined();
  });
});

describe("second-brain helpers", () => {
  it("builds stable titles", () => {
    expect(titleFromFilename("My Report.PDF")).toBe("My Report");
    expect(topicTitle("field-ops")).toBe("Topic — Field Ops");
  });

  it("writes a source note into the vault", async () => {
    const relative = await createSourceNote({
      filename: "approvals-brief.pdf",
      bucket: "research",
      reason: "test",
      confidence: "high",
      theme: "approvals",
      originalPath: "/tmp/inbox/approvals-brief.pdf",
      workspaceRelativePath: "02-Research-Queue/approvals-brief.pdf",
    });
    expect(relative).toBe("Sources/approvals-brief.md");
    const body = await fs.readFile(path.join(vaultDir, relative), "utf8");
    expect(body).toContain("type: source");
    expect(body).toContain("## Original path");
    expect(body).toContain("[[Topic — Approvals]]");
  });
});

describe("log renderers", () => {
  it("renders markdown and CSV rows with confidence", () => {
    const entry: TriageLogEntry = {
      loggedAt: new Date("2026-07-19T12:00:00.000Z"),
      filename: "x.pdf",
      sourcePath: "/tmp/TrueCrew/00-Inbox-Downloads/x.pdf",
      fromFolder: "00-Inbox-Downloads",
      toFolder: "02-Research-Queue",
      bucket: "research",
      reason: "test",
      confidence: "medium",
      action: "moved",
      theme: "product",
    };
    expect(renderTriageLogSection(entry)).toContain("Confidence");
    expect(renderSheetRow(entry)).toContain("medium");
  });
});
