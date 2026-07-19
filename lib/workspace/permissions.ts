/**
 * Bot permissions for the TrueCrew research + cleanup pilot.
 *
 * Keep this file boring and explicit. Founders and agents should be able to
 * read it in one pass and know what bots may / may not do.
 */

export const BOT_PERMISSIONS = {
  may: [
    "read files inside the TrueCrew workspace folders",
    "classify files from 00-Inbox-Downloads into approved buckets",
    "move files between approved TrueCrew folders only",
    "rename files when moving (safe collision suffixes)",
    "create Obsidian notes in Sources/, Topics/, and Synthesis/",
    "append structured triage logs (Obsidian Triage Log + local Sheet CSV)",
    "create Google Docs / Sheets logs when Drive sync is pointed at this tree",
  ],
  mayNot: [
    "permanently delete files outside 05-Delete-Candidates",
    "empty 05-Delete-Candidates without an explicit human confirmation step",
    "send emails from any account",
    "touch production SaaS systems (Vercel production deploys, Stripe live, etc.)",
    "move files outside the TrueCrew workspace root",
    "change secrets, DNS, billing, or access-control settings",
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
    "# TrueCrew bot permissions (pilot)",
    "",
    "## Bots MAY",
    "",
    may,
    "",
    "## Bots MAY NOT",
    "",
    mayNot,
    "",
    "Deletions stay human-gated. Move junk into `05-Delete-Candidates`; you empty that folder.",
    "",
  ].join("\n");
}
