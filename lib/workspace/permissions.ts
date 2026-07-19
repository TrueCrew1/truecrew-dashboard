/**
 * Bot permissions for the TrueCrew research + cleanup workflow.
 *
 * Keep this file boring and explicit. Founders and agents should be able to
 * read it in one pass and know what bots may / may not do.
 */

export const BOT_PERMISSIONS = {
  may: [
    "read files inside the TrueCrew workspace folders",
    "classify files from 00-Inbox-Downloads into approved buckets",
    "move and rename files within approved TrueCrew folders only",
    "create Obsidian notes (Sources/, Topics/, Synthesis/)",
    "create and update logs (Operations/Logs/Triage Log.md + 03-Second-Brain/Triage-Log.csv)",
  ],
  mayNot: [
    "permanently delete files outside 05-Delete-Candidates",
    "empty 05-Delete-Candidates without explicit human confirmation",
    "send emails from any account",
    "touch production SaaS systems (Vercel production deploys, Stripe live, secrets, DNS)",
    "move files outside the TrueCrew Google Drive workspace root",
  ],
} as const;

/** Folders bots may read. */
export const READ_ALLOWED_FOLDERS = [
  "00-Inbox-Downloads",
  "01-Needs-Review",
  "02-Research-Queue",
  "03-Second-Brain",
  "04-Archive",
  "05-Delete-Candidates",
] as const;

/** Folders bots may write / move into. */
export const WRITE_ALLOWED_FOLDERS = [
  "01-Needs-Review",
  "02-Research-Queue",
  "03-Second-Brain",
  "04-Archive",
  "05-Delete-Candidates",
] as const;

/** The only folder bots may permanently delete from (still requires --confirm-delete). */
export const DELETE_ALLOWED_FOLDER = "05-Delete-Candidates" as const;

export function assertMoveAllowed(destinationFolder: string): void {
  if (!(WRITE_ALLOWED_FOLDERS as readonly string[]).includes(destinationFolder)) {
    throw new Error(
      `Permission denied: bots may not move files into "${destinationFolder}". ` +
        `Allowed destinations: ${WRITE_ALLOWED_FOLDERS.join(", ")}`,
    );
  }
}

export function assertDeleteAllowed(folderName: string): void {
  if (folderName !== DELETE_ALLOWED_FOLDER) {
    throw new Error(
      `Permission denied: bots may not permanently delete from "${folderName}". ` +
        `Only ${DELETE_ALLOWED_FOLDER} is eligible, and only with --confirm-delete.`,
    );
  }
}

export function renderPermissionsMarkdown(): string {
  const may = BOT_PERMISSIONS.may.map((item) => `- ${item}`).join("\n");
  const mayNot = BOT_PERMISSIONS.mayNot.map((item) => `- ${item}`).join("\n");
  return [
    "# TrueCrew bot permissions",
    "",
    "Google Drive (`TrueCrew/`) is the source of truth for files and the Obsidian vault.",
    "",
    "## Bots MAY",
    "",
    may,
    "",
    "## Bots MAY NOT",
    "",
    mayNot,
    "",
    "Deletions stay human-gated. Junk goes into `05-Delete-Candidates`; **you** empty that folder.",
    "",
  ].join("\n");
}
