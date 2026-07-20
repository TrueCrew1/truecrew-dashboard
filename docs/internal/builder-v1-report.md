# Builder V1 report (prove-out baseline)

This documents the smallest explicit Builder V1 artifact in the repo: a structured
**Builder report** that records approved build work, scoped implementation context,
and verification results (`build` / `test` / `lint`).

## What exists in V1

| Piece | Location | Role |
|---|---|---|
| `BuilderReport` type + helpers | `lib/build/builderReport.ts` | Canonical report shape and status derivation |
| Approval glue + vault logging | `lib/build/recordBuilderReport.ts` | Build a report from a Build approval id and append to the Obsidian build log when configured |
| Tests | `tests/builder-report.test.ts` | Asserts status rules and build-log mapping |

## V1 baseline flow

```
Approved Build card (BuildApprovalRequest)
  → scoped implementation on a branch/PR
  → operator or agent runs npm run build / npm test / npm run lint
  → buildBuilderReportFromApproval({ approvalId, summary, filesOrAreas, branch, prUrl, verification })
  → recordBuilderReport(report)   // optional when vault configured
```

This slice is **honest about limits**:

- It does not run Builder autonomously.
- It does not invent verification results — callers must pass real `verification` outcomes.
- Pending Build cards still live in Chief session state; the report is produced **after** work is done.
- If the vault is not configured, `recordBuilderReport` returns `{ recorded: false, reason }` without throwing.

## Related specs

- Build approval requests: `src/components/chief/agentApprovalGates.ts` (`BuildApprovalRequest`)
- Build Agent packet spec: `docs/BUILDER_AGENT_PACKET_SPEC.md`
- Build Agent QA proposal id: `src/components/chief/buildAgentTestProposal.ts`

## Example (after local verification)

```ts
import { buildBuilderReportFromApproval, recordBuilderReport } from "../lib/build/recordBuilderReport.js";

const report = buildBuilderReportFromApproval({
  approvalId: "apr-build-…",
  summary: "Scoped change summary",
  filesOrAreas: ["lib/build/builderReport.ts"],
  branch: "cursor/builder-v1-report-0eaa",
  verification: [
    { step: "build", outcome: "pass" },
    { step: "test", outcome: "pass" },
    { step: "lint", outcome: "pass" },
  ],
});

await recordBuilderReport(report);
```
