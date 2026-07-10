/**
 * Research Finding → Filing scaffold (Option C: Filing CLI scaffold, no vault writes yet).
 *
 * DESIGN NOTE
 * -----------
 * Slice chosen: a deterministic, side-effect-free "Filing CLI scaffold" that takes a
 * prepared Research Finding payload, validates the required fields, and resolves the
 * exact `knowledge/` destination (path + file name + write mode) it *would* write.
 * It does NOT touch the Obsidian vault or Supabase — that stays future work behind the
 * existing local-first writers in `lib/obsidian`.
 *
 * How it fits the ecosystem:
 * - Mirrors the three filing tiers from `docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md`
 *   (Log / Lesson / Starter-Pass-candidate) and the tier→destination map from
 *   `docs/OBSIDIAN_RESEARCH_INTAKE.md`.
 * - Adds no new write permission, queue, backend route, or DB/schema change.
 * - Chief remains the only approval surface; this module never enqueues or approves —
 *   it only previews where a finding would be filed, so a human/Filing step can act.
 *
 * This module is pure: same input → same output, no I/O, no clock, no randomness.
 * The date is supplied by the caller (in the payload), never read from `Date.now()`,
 * so results are fully deterministic and unit-testable.
 */

/** Filing tiers, aligned with docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md § Filing tiers. */
export type FilingTier = "log" | "lesson" | "starter-pass-candidate";

/** How the resolved destination would be written (no write happens here). */
export type FilingMode = "append" | "create" | "flag";

/**
 * Structured Research Finding payload, aligned with the fixed-heading "Research
 * Finding" note shape in docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md.
 */
export interface ResearchFindingPayload {
  /** ISO date (YYYY-MM-DD) the finding was produced. */
  date: string;
  /** The narrow, verifiable finding. */
  finding: string;
  /** Sources actually checked (≥1 required for a real finding). */
  sources_checked: string[];
  /** Filing tier the Research agent selected. */
  tier: FilingTier;
  /** Short title — required for lesson / starter-pass-candidate (drives the slug). */
  title?: string;
  /** Optional learning-log fields. */
  worked?: string;
  failed?: string;
  next_time?: string;
  /** Optional cross-reference to a Chief approval request (title/id). */
  related_approval?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface FindingDestination {
  tier: FilingTier;
  /** Repo-relative path the finding would be written to. */
  path: string;
  fileName: string;
  mode: FilingMode;
}

export interface FindingPreview extends ValidationResult {
  tier: FilingTier | null;
  destination: FindingDestination | null;
  /** The exact single line that would be appended for a Log-tier finding. */
  logLine: string | null;
}

const FILING_TIERS: readonly FilingTier[] = ["log", "lesson", "starter-pass-candidate"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Deterministic slug: lowercased, non-alphanumerics collapsed to single hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Validate a payload against the required-field rules. Pure; returns all errors. */
export function validateResearchFinding(payload: ResearchFindingPayload): ValidationResult {
  const errors: string[] = [];

  if (!payload.date?.trim()) {
    errors.push("date is required");
  } else if (!ISO_DATE.test(payload.date.trim())) {
    errors.push("date must be ISO format YYYY-MM-DD");
  }

  if (!payload.finding?.trim()) {
    errors.push("finding is required");
  }

  const sources = payload.sources_checked ?? [];
  if (!Array.isArray(sources) || sources.filter((s) => s?.trim()).length === 0) {
    errors.push("sources_checked must list at least one source");
  }

  if (!payload.tier) {
    errors.push("tier is required");
  } else if (!FILING_TIERS.includes(payload.tier)) {
    errors.push(`tier must be one of: ${FILING_TIERS.join(", ")}`);
  }

  if (payload.tier === "lesson" || payload.tier === "starter-pass-candidate") {
    if (!payload.title?.trim()) {
      errors.push(`title is required for tier "${payload.tier}" (used to build the file name)`);
    } else if (slugify(payload.title) === "") {
      errors.push("title must contain at least one alphanumeric character");
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Resolve the destination a valid finding would be filed to, per the tier→destination
 * map in docs/OBSIDIAN_RESEARCH_INTAKE.md. Assumes the payload has already validated.
 */
export function resolveFindingDestination(payload: ResearchFindingPayload): FindingDestination {
  switch (payload.tier) {
    case "log":
      return { tier: "log", path: "knowledge/log.md", fileName: "log.md", mode: "append" };
    case "lesson": {
      const fileName = `${slugify(payload.title ?? "")}.md`;
      return { tier: "lesson", path: `knowledge/lessons/${fileName}`, fileName, mode: "create" };
    }
    case "starter-pass-candidate": {
      const fileName = `${slugify(payload.title ?? "")}.md`;
      return {
        tier: "starter-pass-candidate",
        path: `knowledge/inbox/${fileName}`,
        fileName,
        mode: "flag",
      };
    }
  }
}

/** Deterministic single-line representation for a Log-tier append. */
export function formatLogLine(payload: ResearchFindingPayload): string {
  const finding = payload.finding.trim().replace(/\s+/g, " ");
  const titlePart = payload.title?.trim() ? ` "${payload.title.trim()}"` : "";
  const approvalPart = payload.related_approval?.trim()
    ? ` [approval: ${payload.related_approval.trim()}]`
    : "";
  return `- ${payload.date.trim()} — [research]${titlePart} ${finding} (tier: ${payload.tier})${approvalPart}`;
}

/**
 * Full dry-run preview: validate, and (only if valid) resolve destination + log line.
 * Never writes anything. This is the single entry point the CLI scaffold consumes.
 */
export function previewResearchFinding(payload: ResearchFindingPayload): FindingPreview {
  const validation = validateResearchFinding(payload);
  if (!validation.ok) {
    return { ...validation, tier: null, destination: null, logLine: null };
  }
  return {
    ...validation,
    tier: payload.tier,
    destination: resolveFindingDestination(payload),
    logLine: formatLogLine(payload),
  };
}
