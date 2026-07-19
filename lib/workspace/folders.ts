/**
 * Approved TrueCrew workspace folders.
 * Same names locally and in Google Drive (pilot: Drive Desktop mirrors this tree).
 */

export const WORKSPACE_ROOT_NAME = "TrueCrew";

export const WORKSPACE_FOLDERS = [
  "00-Inbox-Downloads",
  "01-Needs-Review",
  "02-Research-Queue",
  "03-Second-Brain",
  "04-Archive",
  "05-Delete-Candidates",
] as const;

export type WorkspaceFolder = (typeof WORKSPACE_FOLDERS)[number];

export const INBOX_FOLDER: WorkspaceFolder = "00-Inbox-Downloads";

/** Destinations a bot may move files into (not including inbox itself). */
export const TRIAGE_DESTINATIONS = [
  "01-Needs-Review",
  "02-Research-Queue",
  "03-Second-Brain",
  "04-Archive",
  "05-Delete-Candidates",
] as const;

export type TriageDestination = (typeof TRIAGE_DESTINATIONS)[number];

export type TriageBucket =
  | "needs-review"
  | "research"
  | "second-brain"
  | "archive"
  | "delete-candidates";

export const BUCKET_TO_FOLDER: Record<TriageBucket, TriageDestination> = {
  "needs-review": "01-Needs-Review",
  research: "02-Research-Queue",
  "second-brain": "03-Second-Brain",
  archive: "04-Archive",
  "delete-candidates": "05-Delete-Candidates",
};

export const FOLDER_TO_BUCKET: Record<TriageDestination, TriageBucket> = {
  "01-Needs-Review": "needs-review",
  "02-Research-Queue": "research",
  "03-Second-Brain": "second-brain",
  "04-Archive": "archive",
  "05-Delete-Candidates": "delete-candidates",
};

export function isWorkspaceFolder(value: string): value is WorkspaceFolder {
  return (WORKSPACE_FOLDERS as readonly string[]).includes(value);
}

export function isTriageDestination(value: string): value is TriageDestination {
  return (TRIAGE_DESTINATIONS as readonly string[]).includes(value);
}
