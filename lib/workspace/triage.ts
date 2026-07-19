import fs from "node:fs/promises";
import path from "node:path";
import { requireVaultPath, isVaultConfigured } from "../obsidian/config.js";
import { classifyFile } from "./classify.js";
import { requireWorkspacePath } from "./config.js";
import { INBOX_FOLDER } from "./folders.js";
import { appendTriageLogEntry } from "./log.js";
import { moveWithinWorkspace } from "./move.js";
import {
  SYNTHESIS_SOURCE_THRESHOLD,
  createSourceNote,
  createSynthesisDraft,
  titleFromFilename,
  topicTitle,
  upsertTopicNote,
} from "./second-brain.js";
import type { TriageLogEntry, TriageRunOptions, TriageRunResult } from "./types.js";

/** Folder scaffolding — never triage these out of the inbox. */
const INBOX_META_FILES = new Set(["readme.md", ".gitkeep", ".keep"]);

async function listInboxFiles(inboxPath: string): Promise<string[]> {
  const entries = await fs.readdir(inboxPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => !INBOX_META_FILES.has(entry.name.toLowerCase()))
    .map((entry) => path.join(inboxPath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Scan 00-Inbox-Downloads, classify, move, log, and optionally create Obsidian notes.
 */
export async function runTriage(
  options: TriageRunOptions = {},
): Promise<TriageRunResult> {
  const dryRun = Boolean(options.dryRun);
  const workspaceRoot = requireWorkspacePath();
  const inboxPath = path.join(workspaceRoot, INBOX_FOLDER);

  await fs.mkdir(inboxPath, { recursive: true });

  const allFiles = await listInboxFiles(inboxPath);
  const files =
    typeof options.limit === "number" ? allFiles.slice(0, options.limit) : allFiles;

  const entries: TriageLogEntry[] = [];
  const themeSources = new Map<string, string[]>();
  const topicNotesCreated: string[] = [];
  const synthesisNotesCreated: string[] = [];
  let moved = 0;
  let skipped = 0;
  let lastLogPath: string | null = null;
  let lastSheetPath: string | null = null;

  const vaultReady = !options.skipObsidian && isVaultConfigured();
  const vaultRoot = vaultReady ? requireVaultPath() : null;

  for (const sourcePath of files) {
    const classified = classifyFile(sourcePath);

    let destinationPath: string | undefined;
    let sourceNotePath: string | undefined;
    let notes: string | undefined;
    let action: TriageLogEntry["action"] = dryRun ? "dry-run" : "moved";

    try {
      const moveResult = await moveWithinWorkspace(
        workspaceRoot,
        sourcePath,
        classified.destinationFolder,
        dryRun,
      );
      destinationPath = moveResult.destinationPath;
      if (moveResult.renamed) {
        notes = `Renamed on collision to ${moveResult.finalFilename}`;
      }
      if (!dryRun) moved += 1;

      if (classified.createSourceNote && vaultRoot) {
        const workspaceRelativePath = path
          .join(classified.destinationFolder, moveResult.finalFilename)
          .replace(/\\/g, "/");
        sourceNotePath = await createSourceNote(
          {
            filename: moveResult.finalFilename,
            bucket: classified.bucket,
            reason: classified.reason,
            confidence: classified.confidence,
            theme: classified.theme,
            originalPath: sourcePath,
            workspaceRelativePath,
          },
          dryRun,
        );

        if (classified.theme) {
          const noteTitle = titleFromFilename(moveResult.finalFilename);
          const list = themeSources.get(classified.theme) ?? [];
          list.push(noteTitle);
          themeSources.set(classified.theme, list);
        }
      } else if (classified.createSourceNote && !vaultRoot) {
        notes = [notes, "Skipped Obsidian note — vault not configured"]
          .filter(Boolean)
          .join("; ");
      }
    } catch (error) {
      action = "skipped";
      skipped += 1;
      const reason =
        error instanceof Error
          ? `${classified.reason} (skipped: ${error.message})`
          : classified.reason;

      const skippedEntry: TriageLogEntry = {
        loggedAt: new Date(),
        filename: classified.filename,
        sourcePath,
        fromFolder: INBOX_FOLDER,
        toFolder: classified.destinationFolder,
        bucket: classified.bucket,
        reason,
        confidence: classified.confidence,
        action,
        theme: classified.theme,
      };
      const paths = await appendTriageLogEntry(workspaceRoot, skippedEntry, {
        skipObsidian: options.skipObsidian,
        dryRun,
      });
      lastLogPath = paths.logPath ?? lastLogPath;
      lastSheetPath = paths.sheetPath;
      entries.push(skippedEntry);
      continue;
    }

    const entry: TriageLogEntry = {
      loggedAt: new Date(),
      filename: classified.filename,
      sourcePath,
      fromFolder: INBOX_FOLDER,
      toFolder: classified.destinationFolder,
      bucket: classified.bucket,
      reason: classified.reason,
      confidence: classified.confidence,
      action,
      notes,
      destinationPath,
      sourceNotePath,
      theme: classified.theme,
    };

    const paths = await appendTriageLogEntry(workspaceRoot, entry, {
      skipObsidian: options.skipObsidian,
      dryRun,
    });
    lastLogPath = paths.logPath ?? lastLogPath;
    lastSheetPath = paths.sheetPath;
    entries.push(entry);
  }

  if (vaultRoot) {
    for (const [theme, sourceTitles] of themeSources) {
      if (sourceTitles.length < 1) continue;

      const topicPath = await upsertTopicNote(
        vaultRoot,
        { theme, sourceNoteTitles: sourceTitles },
        dryRun,
      );
      topicNotesCreated.push(topicPath);

      if (sourceTitles.length >= SYNTHESIS_SOURCE_THRESHOLD) {
        const synthesisPath = await createSynthesisDraft(
          {
            theme,
            sourceNoteTitles: sourceTitles,
            topicNoteTitle: topicTitle(theme),
          },
          dryRun,
        );
        synthesisNotesCreated.push(synthesisPath);
      }
    }
  }

  return {
    scanned: allFiles.length,
    processed: files.length,
    moved,
    skipped,
    dryRun,
    entries,
    topicNotesCreated,
    synthesisNotesCreated,
    logPath: lastLogPath,
    sheetPath: lastSheetPath,
  };
}
