import fs from "node:fs";

/**
 * Repo hygiene reporting — a small, honest summary of build/test/lint/doc
 * signals, not a bot framework. Anything this repo can't actually know
 * without an external call (GitHub API, a security-scanning service) is
 * reported as `not_wired`, never guessed or faked. See
 * docs/internal/repo-hygiene-report.md for what's real vs. placeholder here.
 */

export type HygieneStatus = "healthy" | "warning" | "unknown" | "not_wired";

export interface HygieneSignal {
  status: HygieneStatus;
  message: string;
}

export interface RepoHygieneSummary {
  build: HygieneSignal;
  tests: HygieneSignal;
  lint: HygieneSignal;
  docTruth: HygieneSignal;
  branchAudit: HygieneSignal;
  securityAudit: HygieneSignal;
}

export type CheckOutcome = "pass" | "fail";

export interface RepoHygieneInputs {
  /** Result of the last known `npm run build` run — omit if it hasn't run this session. */
  build?: CheckOutcome;
  /** Result of the last known `npm test` run. */
  tests?: CheckOutcome;
  /** Result of the last known `npm run lint` run. */
  lint?: CheckOutcome;
}

/**
 * A doc's claim that a specific file/script exists at a given path — the
 * only kind of "doc/code drift" this module can honestly check, since it's
 * pure filesystem fact, not a live GitHub/CI signal.
 */
export interface DocFileReference {
  docPath: string;
  referencedPath: string;
  description: string;
}

/**
 * Real, currently-true example: docs/internal/chief-v1-governed-loops.md's
 * "Pre-merge checks" section tells operators to run
 * `bash scripts/check-governance.sh`. That script is not tracked by git
 * anywhere in this repo's history (confirmed via `git log --all`) — it only
 * exists where a local session happened to create it. A fresh clone is
 * missing it, so this reference is a genuine drift check, not a fixture.
 */
export const DEFAULT_DOC_FILE_REFERENCES: DocFileReference[] = [
  {
    docPath: "docs/internal/chief-v1-governed-loops.md",
    referencedPath: "scripts/check-governance.sh",
    description: "Pre-merge checks section documents `bash scripts/check-governance.sh`",
  },
];

function deriveCheckSignal(outcome: CheckOutcome | undefined, label: string): HygieneSignal {
  if (outcome === "pass") {
    return { status: "healthy", message: `${label} passed on last run.` };
  }
  if (outcome === "fail") {
    return { status: "warning", message: `${label} failed on last run — needs attention.` };
  }
  return {
    status: "unknown",
    message: `${label} result not provided — this module does not run commands itself; pass in the last known result to get a real signal.`,
  };
}

/**
 * Pure by design: takes the file-existence check as a parameter instead of
 * always reaching for `fs` itself, so tests can assert against fixtures
 * without touching the real filesystem. buildRepoHygieneSummary() below
 * supplies the real `fs.existsSync`-backed check by default.
 */
export function deriveDocTruthSignal(
  references: DocFileReference[],
  fileExists: (path: string) => boolean,
): HygieneSignal {
  if (references.length === 0) {
    return { status: "unknown", message: "No doc→file references configured to check." };
  }

  const missing = references.filter((ref) => !fileExists(ref.referencedPath));
  if (missing.length === 0) {
    return {
      status: "healthy",
      message: `All ${references.length} tracked doc→file reference(s) resolve to real files.`,
    };
  }

  return {
    status: "warning",
    message: `${missing.length} of ${references.length} doc reference(s) point to missing files: ${missing
      .map((ref) => `"${ref.description}" (${ref.docPath} → ${ref.referencedPath})`)
      .join("; ")}`,
  };
}

const BRANCH_AUDIT_NOT_WIRED: HygieneSignal = {
  status: "not_wired",
  message:
    "Stale branch/PR auditing requires the GitHub API, which this module does not call. See docs/internal/agent-bot-compliance-plan.md's proposed repo-health bot for the real plan.",
};

const SECURITY_AUDIT_NOT_WIRED: HygieneSignal = {
  status: "not_wired",
  message:
    "Dependency/security auditing (e.g. npm audit, Dependabot alerts) is not wired into this module — run `npm audit` manually.",
};

function realFileExists(relativePath: string): boolean {
  return fs.existsSync(relativePath);
}

/**
 * Builds the repo hygiene summary. `inputs` carries the only signals this
 * repo can't compute on its own (build/test/lint results) — pass in the
 * outcome of a run you just did; omit any you don't have and it reports
 * `unknown` for that one rather than guessing. `docReferences` defaults to
 * DEFAULT_DOC_FILE_REFERENCES and `fileExists` defaults to a real
 * `fs.existsSync` check; both are overridable so tests can run against
 * fixtures instead of the real filesystem.
 */
export function buildRepoHygieneSummary(
  inputs: RepoHygieneInputs = {},
  options: {
    docReferences?: DocFileReference[];
    fileExists?: (path: string) => boolean;
  } = {},
): RepoHygieneSummary {
  const docReferences = options.docReferences ?? DEFAULT_DOC_FILE_REFERENCES;
  const fileExists = options.fileExists ?? realFileExists;

  return {
    build: deriveCheckSignal(inputs.build, "Build"),
    tests: deriveCheckSignal(inputs.tests, "Test suite"),
    lint: deriveCheckSignal(inputs.lint, "Lint"),
    docTruth: deriveDocTruthSignal(docReferences, fileExists),
    branchAudit: BRANCH_AUDIT_NOT_WIRED,
    securityAudit: SECURITY_AUDIT_NOT_WIRED,
  };
}
