import type { TriageBucket, TriageDestination } from "./folders.js";

export type TriageAction = "moved" | "skipped" | "dry-run";

/** How sure the rule-based classifier is. */
export type ClassificationConfidence = "high" | "medium" | "low";

export interface ClassifiedFile {
  /** Absolute path of the file currently in the inbox. */
  sourcePath: string;
  /** Original filename (basename). */
  filename: string;
  bucket: TriageBucket;
  destinationFolder: TriageDestination;
  /** Short plain-English reason for the classification. */
  reason: string;
  confidence: ClassificationConfidence;
  /** Optional theme slug for second-brain topic grouping (e.g. "field-ops"). */
  theme?: string;
  /** Whether this file should get an Obsidian Sources/ note. */
  createSourceNote: boolean;
}

export interface TriageLogEntry {
  loggedAt: Date;
  filename: string;
  /** Absolute path before the move (inbox). */
  sourcePath: string;
  fromFolder: string;
  toFolder: TriageDestination;
  bucket: TriageBucket;
  reason: string;
  confidence: ClassificationConfidence;
  action: TriageAction;
  notes?: string;
  destinationPath?: string;
  sourceNotePath?: string;
  theme?: string;
}

export interface TriageRunOptions {
  /** When true, classify and print plans but do not move files or change notes. */
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
  confidence: ClassificationConfidence;
  theme?: string;
  /** Absolute path where the file was found (inbox). */
  originalPath: string;
  /** Relative path inside the TrueCrew workspace after move. */
  workspaceRelativePath: string;
  /** Optional short summary stub (bots fill a starter; humans refine). */
  summary?: string;
  /** Optional starter key points. */
  keyPoints?: string[];
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
