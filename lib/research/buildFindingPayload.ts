/**
 * Research Finding payload builder (pure, deterministic).
 *
 * Turns a small set of explicit Research fields (question, sources, evidence
 * summary, tier, category) into a `ResearchFindingPayload` that
 * `lib/research/researchFinding.ts` will accept. This is the Research-side
 * counterpart to the Filing scaffold: Research produces the payload, Filing
 * (dry-run) resolves where it would be written.
 *
 * Deterministic by construction: the date is supplied by the caller (config),
 * never read from `Date.now()`. No I/O, no vault/Supabase writes, no queues.
 */
import {
  validateResearchFinding,
  type FilingTier,
  type ResearchFindingPayload,
  type ValidationResult,
} from "./researchFinding";

/** Explicit inputs a Research session provides to build one finding payload. */
export interface BuildFindingInput {
  /** ISO date (YYYY-MM-DD), read from config — never generated here. */
  date: string;
  /** The question the finding answers (becomes the title for lesson/starter tiers). */
  question: string;
  /** Sources actually checked. */
  sources: string[];
  /** Evidence summary — the narrow, verifiable finding text. */
  evidence: string;
  /** Filing tier the Research agent selected. */
  tier: FilingTier;
  /** Optional category tag (e.g. "governance", "tooling"). */
  category?: string;
  /** Optional learning-log fields. */
  worked?: string;
  failed?: string;
  next_time?: string;
  /** Optional cross-reference to a Chief approval request (title/id). */
  related_approval?: string;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Build a `ResearchFindingPayload` from explicit inputs. Pure mapping only —
 * validation is a separate step via `buildAndValidateFinding`.
 */
export function buildFindingPayload(input: BuildFindingInput): ResearchFindingPayload {
  const sources = (input.sources ?? []).map((s) => s.trim()).filter((s) => s.length > 0);

  const payload: ResearchFindingPayload = {
    date: input.date.trim(),
    finding: input.evidence.trim().replace(/\s+/g, " "),
    sources_checked: sources,
    tier: input.tier,
  };

  const title = clean(input.question);
  if (title) payload.title = title;

  const category = clean(input.category);
  if (category) payload.category = category;

  const worked = clean(input.worked);
  if (worked) payload.worked = worked;

  const failed = clean(input.failed);
  if (failed) payload.failed = failed;

  const nextTime = clean(input.next_time);
  if (nextTime) payload.next_time = nextTime;

  const approval = clean(input.related_approval);
  if (approval) payload.related_approval = approval;

  return payload;
}

export interface BuildResult {
  payload: ResearchFindingPayload;
  validation: ValidationResult;
}

/** Build the payload and validate it in one step (still pure, no I/O). */
export function buildAndValidateFinding(input: BuildFindingInput): BuildResult {
  const payload = buildFindingPayload(input);
  return { payload, validation: validateResearchFinding(payload) };
}
