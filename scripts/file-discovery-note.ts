#!/usr/bin/env node
/**
 * File a typed discovery note under knowledge/sources/ (filing only — no AI, no HTTP).
 *
 * Usage:
 *   npm run discovery:file -- \
 *     --type finding \
 *     --title "Overdue PM is the first signal supervisors check" \
 *     --created-by research \
 *     [--truth-level hypothesis] \
 *     [--status draft] \
 *     [--sensitivity none|regulated] \
 *     [--regs MSHA,OSHA,...] \
 *     [--scope discovery] \
 *     [--data-type desk_research] \
 *     [--links link1,link2] \
 *     [--tags tag1,tag2] \
 *     [--allow-interview]
 *
 * Types: finding | workflow_observation | competitor_profile | assumption | question
 *        | interview (opt-in only; pass --allow-interview)
 *
 * Id convention: {type-prefix}-YYYY-MM-DD-{slug} (e.g. finding-2026-07-20-pm-overdue)
 * Filename: knowledge/sources/{subdir}/YYYY-MM-DD-{slug}.md
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KNOWLEDGE_ROOT = path.join(REPO_ROOT, "knowledge");
const TEMPLATES_DIR = path.join(KNOWLEDGE_ROOT, "templates");
const SOURCES_ROOT = path.join(KNOWLEDGE_ROOT, "sources");

const NOTE_TYPES = [
  "finding",
  "workflow_observation",
  "competitor_profile",
  "assumption",
  "question",
  "interview",
] as const;

type NoteType = (typeof NOTE_TYPES)[number];

const DEFAULT_TYPES: readonly NoteType[] = [
  "finding",
  "workflow_observation",
  "competitor_profile",
  "assumption",
  "question",
];

const TYPE_CONFIG: Record<
  NoteType,
  { subdir: string; templateFile: string; idPrefix: string; defaultScope: string; defaultTruthLevel: string; defaultDataType: string }
> = {
  finding: {
    subdir: "findings",
    templateFile: "finding-template.md",
    idPrefix: "finding",
    defaultScope: "discovery",
    defaultTruthLevel: "hypothesis",
    defaultDataType: "desk_research",
  },
  workflow_observation: {
    subdir: "workflows",
    templateFile: "workflow-observation-template.md",
    idPrefix: "workflow",
    defaultScope: "ops-workflow",
    defaultTruthLevel: "observed",
    defaultDataType: "desk_research",
  },
  competitor_profile: {
    subdir: "competitors",
    templateFile: "competitor-profile-template.md",
    idPrefix: "competitor",
    defaultScope: "competitor",
    defaultTruthLevel: "reported",
    defaultDataType: "desk_research",
  },
  assumption: {
    subdir: "assumptions",
    templateFile: "assumption-template.md",
    idPrefix: "assumption",
    defaultScope: "discovery",
    defaultTruthLevel: "hypothesis",
    defaultDataType: "synthetic",
  },
  question: {
    subdir: "questions",
    templateFile: "question-template.md",
    idPrefix: "question",
    defaultScope: "discovery",
    defaultTruthLevel: "hypothesis",
    defaultDataType: "synthetic",
  },
  interview: {
    subdir: "interviews",
    templateFile: "interview-template.md",
    idPrefix: "interview",
    defaultScope: "discovery",
    defaultTruthLevel: "reported",
    defaultDataType: "interview",
  },
};

const TRUTH_LEVELS = new Set(["observed", "reported", "hypothesis", "validated", "rejected"]);
const STATUSES = new Set(["draft", "active", "validated", "deprecated"]);
const DATA_TYPES = new Set([
  "interview",
  "field_note",
  "desk_research",
  "synthetic",
  "decision",
  "mixed",
]);
const SENSITIVITY_CLI = new Set(["none", "regulated"]);

interface CliOptions {
  type: NoteType;
  title: string;
  createdBy: string;
  truthLevel: string;
  status: string;
  sensitivity: "internal" | "regulated";
  regs: string[];
  scope: string;
  dataType: string;
  links: string[];
  tags: string[];
  allowInterview: boolean;
}

function usage(): string {
  return `File a typed discovery note (filing only — no AI)

Usage:
  npm run discovery:file -- \\
    --type finding \\
    --title "..." \\
    --created-by research \\
    [--truth-level hypothesis] \\
    [--status draft] \\
    [--sensitivity none|regulated] \\
    [--regs MSHA,OSHA,...] \\
    [--scope discovery] \\
    [--data-type desk_research] \\
    [--links link1,link2] \\
    [--tags tag1,tag2] \\
    [--allow-interview]

Types: ${DEFAULT_TYPES.join(" | ")} | interview (requires --allow-interview)
`;
}

function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseArgs(argv: string[]): CliOptions {
  const flags = new Map<string, string>();
  const booleans = new Set<string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      booleans.add(key);
      continue;
    }
    flags.set(key, next);
    i += 1;
  }

  const typeRaw = flags.get("type")?.trim();
  if (!typeRaw || !NOTE_TYPES.includes(typeRaw as NoteType)) {
    throw new Error(`--type is required and must be one of: ${NOTE_TYPES.join(", ")}`);
  }
  const type = typeRaw as NoteType;

  const allowInterview = booleans.has("allow-interview");
  if (type === "interview" && !allowInterview) {
    throw new Error(
      "interview notes are opt-in only — pass --allow-interview to file this type",
    );
  }

  const title = flags.get("title")?.trim();
  if (!title) throw new Error("--title is required");

  const createdBy = flags.get("created-by")?.trim();
  if (!createdBy) throw new Error("--created-by is required");

  const config = TYPE_CONFIG[type];
  const truthLevel = flags.get("truth-level")?.trim() ?? config.defaultTruthLevel;
  if (!TRUTH_LEVELS.has(truthLevel)) {
    throw new Error(`--truth-level must be one of: ${[...TRUTH_LEVELS].join(", ")}`);
  }

  const status = flags.get("status")?.trim() ?? "draft";
  if (!STATUSES.has(status)) {
    throw new Error(`--status must be one of: ${[...STATUSES].join(", ")}`);
  }

  const sensitivityCli = flags.get("sensitivity")?.trim() ?? "none";
  if (!SENSITIVITY_CLI.has(sensitivityCli)) {
    throw new Error("--sensitivity must be none or regulated");
  }

  const regs = parseCsv(flags.get("regs")).map((reg) => reg.toUpperCase());
  if (regs.length > 0 && sensitivityCli !== "regulated") {
    throw new Error("when --regs is set, --sensitivity must be regulated");
  }

  const sensitivity: CliOptions["sensitivity"] =
    sensitivityCli === "regulated" ? "regulated" : "internal";

  const dataType = flags.get("data-type")?.trim() ?? config.defaultDataType;
  if (!DATA_TYPES.has(dataType)) {
    throw new Error(`--data-type must be one of: ${[...DATA_TYPES].join(", ")}`);
  }

  return {
    type,
    title,
    createdBy,
    truthLevel,
    status,
    sensitivity,
    regs,
    scope: flags.get("scope")?.trim() ?? config.defaultScope,
    dataType,
    links: parseCsv(flags.get("links")),
    tags: parseCsv(flags.get("tags")),
    allowInterview,
  };
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatInlineList(values: string[]): string {
  if (values.length === 0) return "[]";
  return `[${values.join(", ")}]`;
}

function yamlQuote(value: string): string {
  if (/[:#\n'"&*!?|>@[\]{},]/.test(value) || value.startsWith(" ") || value.endsWith(" ")) {
    return JSON.stringify(value);
  }
  return value;
}

function buildFrontmatter(options: CliOptions, id: string, date: string): string {
  const lines = [
    "---",
    `id: ${id}`,
    `title: ${yamlQuote(options.title)}`,
    `type: ${options.type}`,
    `status: ${options.status}`,
    `truth_level: ${options.truthLevel}`,
    `scope: ${options.scope}`,
    `sensitivity: ${options.sensitivity}`,
    `regs: ${formatInlineList(options.regs)}`,
    `data_type: ${options.dataType}`,
    `created_by: ${options.createdBy}`,
    `created_at: ${date}`,
    `updated_at: ${date}`,
    `links: ${formatInlineList(options.links)}`,
    `tags: ${formatInlineList(options.tags)}`,
    "---",
  ];
  return lines.join("\n");
}

export function splitTemplate(raw: string): { body: string } {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    throw new Error("template is missing YAML frontmatter");
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error("template frontmatter is not closed");
  }
  const body = trimmed.slice(end + "\n---".length).replace(/^\n/, "");
  return { body };
}

export function applyTitleToBody(body: string, title: string): string {
  return body.replace(/^# \{Title\}/m, `# ${title}`);
}

export function resolveTargetPath(type: NoteType, date: string, slug: string): string {
  const { subdir } = TYPE_CONFIG[type];
  return path.join(SOURCES_ROOT, subdir, `${date}-${slug}.md`);
}

export async function fileDiscoveryNote(options: CliOptions): Promise<string> {
  const config = TYPE_CONFIG[options.type];
  const date = todayIsoDate();
  const slug = slugifyTitle(options.title);
  if (!slug) {
    throw new Error("title slugified to empty string — use a more descriptive --title");
  }

  const id = `${config.idPrefix}-${date}-${slug}`;
  const targetPath = resolveTargetPath(options.type, date, slug);
  const templatePath = path.join(TEMPLATES_DIR, config.templateFile);

  try {
    await fs.access(targetPath);
    throw new Error(`refusing to overwrite existing file: ${path.relative(REPO_ROOT, targetPath)}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("refusing to overwrite")) {
      throw error;
    }
  }

  const templateRaw = await fs.readFile(templatePath, "utf8");
  const { body } = splitTemplate(templateRaw);
  const content = `${buildFrontmatter(options, id, date)}\n\n${applyTitleToBody(body, options.title)}`;

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
  return targetPath;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
    console.log(usage());
    return;
  }

  const options = parseArgs(argv);
  const targetPath = await fileDiscoveryNote(options);
  const relativePath = path.relative(REPO_ROOT, targetPath);

  console.log(`Created ${relativePath}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Edit the note body and add evidence (sources, quotes, links).");
  console.log("  2. Set truth_level / status honestly — hypotheses are not policy.");
  console.log("  3. If regulated, keep sensitivity: regulated and regs populated.");
  console.log("  4. Optionally append one line to knowledge/log.md when ready.");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
