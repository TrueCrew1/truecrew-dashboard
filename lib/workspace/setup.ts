import fs from "node:fs/promises";
import path from "node:path";
import { WORKSPACE_FOLDERS } from "./folders.js";
import { TRIAGE_SHEET_RELATIVE_PATH, renderSheetHeader } from "./log.js";
import { DEFAULT_VAULT_PATH, VAULT_LAYOUT_FOLDERS } from "./paths.js";
import { renderPermissionsMarkdown } from "./permissions.js";

function folderReadme(folderName: string): string {
  const blurb: Record<string, string> = {
    "00-Inbox-Downloads":
      "Drop new downloads and captures here. Bots scan this folder and move files out.",
    "01-Needs-Review":
      "Unclear files land here. A human decides the next bucket — bots do not guess hard.",
    "02-Research-Queue":
      "Research-shaped docs waiting to be read. Source notes get created in Obsidian.",
    "03-Second-Brain":
      "Note-shaped reference files and Triage-Log.csv (import into Google Sheets).",
    "04-Archive":
      "Keepers you do not need day to day. Not delete — just cold storage.",
    "05-Delete-Candidates":
      "Junk parked for deletion. Only a human empties this folder.",
  };

  return [
    `# ${folderName}`,
    "",
    blurb[folderName] ?? "TrueCrew workspace folder.",
    "",
    "Google Drive is the source of truth. See `docs/RESEARCH_CLEANUP_WORKFLOW.md`.",
    "",
  ].join("\n");
}

const GOOGLE_DRIVE_README = `# Google Drive is the source of truth

This \`TrueCrew/\` tree lives in Google Drive. Obsidian opens a vault *inside* this tree:

\`\`\`
TrueCrew/
  00-Inbox-Downloads/
  01-Needs-Review/
  02-Research-Queue/
  03-Second-Brain/
  04-Archive/
  05-Delete-Candidates/
  Obsidian Vaults/
    TrueCrew Second Brain/   ← open this folder in Obsidian
\`\`\`

## Daily loop

1. Drop messy files into \`00-Inbox-Downloads\`.
2. Run \`npm run workspace:triage\` from the dashboard repo.
3. Review \`01-Needs-Review\` and \`05-Delete-Candidates\` yourself.
4. Open Obsidian vault **TrueCrew Second Brain** to see new Sources / Topics / Synthesis notes.

Bots do **not** send email and do **not** permanently delete outside Delete-Candidates.
`;

/**
 * Create the TrueCrew folder tree, permissions note, CSV log, and vault parent dirs.
 */
export async function setupWorkspace(workspaceRoot: string): Promise<{
  root: string;
  vaultPath: string;
  createdFolders: string[];
  createdFiles: string[];
}> {
  const createdFolders: string[] = [];
  const createdFiles: string[] = [];
  const vaultPath = path.join(
    workspaceRoot,
    "Obsidian Vaults",
    "TrueCrew Second Brain",
  );

  await fs.mkdir(workspaceRoot, { recursive: true });

  for (const folder of WORKSPACE_FOLDERS) {
    const folderPath = path.join(workspaceRoot, folder);
    await fs.mkdir(folderPath, { recursive: true });
    createdFolders.push(folder);

    const readmePath = path.join(folderPath, "README.md");
    try {
      await fs.access(readmePath);
    } catch {
      await fs.writeFile(readmePath, folderReadme(folder), "utf8");
      createdFiles.push(path.join(folder, "README.md"));
    }
  }

  // Ensure Obsidian vault root + layout folders exist under Drive.
  await fs.mkdir(vaultPath, { recursive: true });
  createdFolders.push("Obsidian Vaults/TrueCrew Second Brain");
  for (const folder of VAULT_LAYOUT_FOLDERS) {
    await fs.mkdir(path.join(vaultPath, folder), { recursive: true });
    createdFolders.push(`Obsidian Vaults/TrueCrew Second Brain/${folder}`);
  }

  const permissionsPath = path.join(workspaceRoot, "BOT_PERMISSIONS.md");
  try {
    await fs.access(permissionsPath);
  } catch {
    await fs.writeFile(permissionsPath, renderPermissionsMarkdown(), "utf8");
    createdFiles.push("BOT_PERMISSIONS.md");
  }

  const driveReadmePath = path.join(workspaceRoot, "GOOGLE_DRIVE.md");
  try {
    await fs.access(driveReadmePath);
  } catch {
    await fs.writeFile(driveReadmePath, GOOGLE_DRIVE_README, "utf8");
    createdFiles.push("GOOGLE_DRIVE.md");
  }

  const sheetPath = path.join(workspaceRoot, TRIAGE_SHEET_RELATIVE_PATH);
  try {
    await fs.access(sheetPath);
  } catch {
    await fs.mkdir(path.dirname(sheetPath), { recursive: true });
    await fs.writeFile(sheetPath, `${renderSheetHeader()}\n`, "utf8");
    createdFiles.push(TRIAGE_SHEET_RELATIVE_PATH);
  }

  // Prefer the vault nested under this workspace when defaults match.
  if (vaultPath !== DEFAULT_VAULT_PATH && !process.env.OBSIDIAN_VAULT_PATH) {
    process.env.OBSIDIAN_VAULT_PATH = vaultPath;
  }

  return { root: workspaceRoot, vaultPath, createdFolders, createdFiles };
}
