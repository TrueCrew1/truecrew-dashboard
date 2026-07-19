import path from "node:path";
import { BUCKET_TO_FOLDER, type TriageBucket } from "./folders.js";
import type { ClassifiedFile } from "./types.js";

const JUNK_NAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  ".localized",
  "icon\r",
]);

const JUNK_EXTENSIONS = new Set([
  ".tmp",
  ".temp",
  ".crdownload",
  ".part",
  ".download",
  ".bak",
  ".old",
]);

const ARCHIVE_EXTENSIONS = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".7z",
  ".rar",
  ".dmg",
  ".iso",
]);

const RESEARCH_EXTENSIONS = new Set([
  ".pdf",
  ".epub",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".html",
  ".htm",
]);

const SECOND_BRAIN_EXTENSIONS = new Set([".md", ".txt", ".rtf", ".markdown"]);

const RESEARCH_NAME_HINTS = [
  "research",
  "article",
  "paper",
  "whitepaper",
  "study",
  "report",
  "competitor",
  "market",
  "interview",
  "transcript",
  "brief",
];

const SECOND_BRAIN_NAME_HINTS = [
  "note",
  "notes",
  "meeting",
  "idea",
  "decision",
  "lesson",
  "sop",
  "runbook",
  "checklist",
  "howto",
  "how-to",
  "playbook",
];

const ARCHIVE_NAME_HINTS = [
  "archive",
  "backup",
  "old",
  "legacy",
  "copy",
  "duplicate",
  "export",
];

const THEME_RULES: Array<{ theme: string; patterns: RegExp[] }> = [
  {
    theme: "field-ops",
    patterns: [/field/, /ops/, /maintenance/, /repair/, /supervisor/, /operator/],
  },
  {
    theme: "approvals",
    patterns: [/approv/, /gate/, /chief/, /escalat/],
  },
  {
    theme: "second-brain",
    patterns: [/second[- ]?brain/, /obsidian/, /knowledge/, /vault/],
  },
  {
    theme: "customers",
    patterns: [/customer/, /client/, /onboard/, /retention/],
  },
  {
    theme: "product",
    patterns: [/product/, /roadmap/, /feature/, /saas/],
  },
];

function normalizeName(filename: string): string {
  return filename.toLowerCase();
}

function hasHint(name: string, hints: string[]): boolean {
  return hints.some((hint) => name.includes(hint));
}

function detectTheme(filename: string): string | undefined {
  const name = normalizeName(filename);
  for (const rule of THEME_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(name))) {
      return rule.theme;
    }
  }
  return undefined;
}

/**
 * Rule-based pilot classifier.
 * Defaults to needs-review when unsure — founder keeps control.
 */
export function classifyFile(sourcePath: string): ClassifiedFile {
  const filename = path.basename(sourcePath);
  const name = normalizeName(filename);
  const ext = path.extname(name);
  const theme = detectTheme(filename);

  let bucket: TriageBucket = "needs-review";
  let reason = "Unclear type — parked in Needs Review for a human look.";

  if (JUNK_NAMES.has(name) || JUNK_EXTENSIONS.has(ext) || name.startsWith("~$")) {
    bucket = "delete-candidates";
    reason = "Looks like junk/temp (safe delete-candidate, not permanent delete).";
  } else if (ARCHIVE_EXTENSIONS.has(ext) || hasHint(name, ARCHIVE_NAME_HINTS)) {
    bucket = "archive";
    reason = "Looks like a backup/archive package.";
  } else if (RESEARCH_EXTENSIONS.has(ext) || hasHint(name, RESEARCH_NAME_HINTS)) {
    bucket = "research";
    reason = "Research-shaped document — queued for reading.";
  } else if (
    SECOND_BRAIN_EXTENSIONS.has(ext) ||
    hasHint(name, SECOND_BRAIN_NAME_HINTS)
  ) {
    bucket = "second-brain";
    reason = "Note-shaped file — candidate for the second brain.";
  }

  const createSourceNote = bucket === "research" || bucket === "second-brain";

  return {
    sourcePath,
    filename,
    bucket,
    destinationFolder: BUCKET_TO_FOLDER[bucket],
    reason,
    theme,
    createSourceNote,
  };
}
