import type { TriageBucket, TriageDestination } from "./folders.js";

export type TriageAction = "moved" | "skipped" | "dry-run";

export interface ClassifiedFile {
  /** Absolute path of the file currently in the inbox. */
  sourcePath: string;
  /** Original filename (basename). */
  filename: string;
  bucket: TriageBucket;
  destinationFolder: TriageDestination;
  /** Short plain-English reason for the classification. */
  reason: string;
  /** Optional theme slug for second-brain topic grouping (e.g. "field-ops"). */
  theme?: string;
  /** Whether this file should get an Obsidian Sources/ note. */
  createSourceNote: boolean;
}

export interface TriageLogEntry {
  loggedAt: Date;
  filename: string;
  fromFolder: string;
  toFolder: TriageDestination;
  bucket: TriageBucket;
  reason: string;
  action: TriageAction;
  destinationPath?: string;
  sourceNotePath?: string;
  theme?: string;
}

export interface TriageRunOptions {
  /** When true, classify and log but do not move files or write notes. */
  dryRun?: boolean;
  /** Limit how many inbox files to process in one run (pilot safety). */
  limit?: number;
  /** Skip Obsidian note creation even when vault is configured. */
  skipObsidian?: boolean;
}

export interface TriageRunResult {
  scanned: number;
  processed: number;
  moved: number;
  skipped: number;
  dryRun: boolean;
  entries: TriageLogEntry[];
  topicNotesCreated: string[];
  synthesisNotesCreated: string[];
  logPath: string | null;
  sheetPath: string | null;
}

export interface SourceNoteInput {
  filename: string;
  bucket: TriageBucket;
  reason: string;
  theme?: string;
  /** Relative path inside the TrueCrew workspace after move. */
  workspaceRelativePath: string;
}

export interface TopicNoteInput {
  theme: string;
  sourceNoteTitles: string[];
}

export interface SynthesisNoteInput {
  theme: string;
  sourceNoteTitles: string[];
  topicNoteTitle: string;
}
