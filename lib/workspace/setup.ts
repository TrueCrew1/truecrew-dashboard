import fs from "node:fs/promises";
import path from "node:path";
import { WORKSPACE_FOLDERS } from "./folders.js";
import { TRIAGE_SHEET_RELATIVE_PATH, renderSheetHeader } from "./log.js";
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
      "Note-shaped files and the local Triage-Log.csv (Google Sheets import).",
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
    "Part of the TrueCrew research + cleanup pilot.",
    "See `docs/RESEARCH_CLEANUP_WORKFLOW.md` in the repo.",
    "",
  ].join("\n");
}

const GOOGLE_DRIVE_MIRROR = `# Google Drive mirror (pilot)

Use the **same folder names** in Google Drive:

\`\`\`
TrueCrew/
  00-Inbox-Downloads/
  01-Needs-Review/
  02-Research-Queue/
  03-Second-Brain/
  04-Archive/
  05-Delete-Candidates/
\`\`\`

## Recommended setup (simple)

1. Install **Google Drive for Desktop**.
2. Point \`TRUECREW_WORKSPACE_PATH\` at the Drive-synced \`TrueCrew\` folder
   (or run \`npm run workspace:setup\` so this tree is created there).
3. Drop files into \`00-Inbox-Downloads\` from Finder or Drive.
4. Run triage locally — moves sync back to Drive automatically.

## Logs in Google Workspace

| Log | Where |
|-----|--------|
| Triage CSV | \`03-Second-Brain/Triage-Log.csv\` — File → Import into Google Sheets |
| Obsidian log | Vault: \`Operations/Logs/Triage Log.md\` |
| Permissions | \`BOT_PERMISSIONS.md\` in this folder |

Bots do **not** send email and do **not** permanently delete outside Delete-Candidates.
`;

/**
 * Create the TrueCrew folder tree, READMEs, permissions note, and empty sheet log.
 */
export async function setupWorkspace(workspaceRoot: string): Promise<{
  root: string;
  createdFolders: string[];
  createdFiles: string[];
}> {
  const createdFolders: string[] = [];
  const createdFiles: string[] = [];

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

  const permissionsPath = path.join(workspaceRoot, "BOT_PERMISSIONS.md");
  try {
    await fs.access(permissionsPath);
  } catch {
    await fs.writeFile(permissionsPath, renderPermissionsMarkdown(), "utf8");
    createdFiles.push("BOT_PERMISSIONS.md");
  }

  const driveMirrorPath = path.join(workspaceRoot, "GOOGLE_DRIVE.md");
  try {
    await fs.access(driveMirrorPath);
  } catch {
    await fs.writeFile(driveMirrorPath, GOOGLE_DRIVE_MIRROR, "utf8");
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

  return { root: workspaceRoot, createdFolders, createdFiles };
}
