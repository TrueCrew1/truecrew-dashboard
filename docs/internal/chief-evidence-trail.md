# Chief governed evidence trail (V1)

**Aggregation:** `src/lib/chief/governedEvidenceTrail.ts`  
**UI:** `ChiefEvidenceTrailSection` on Chief → Approvals cards

This is the V1 evidence-trail surface for governed work. It answers:

- What approval or mission triggered the work?
- What happened after approval?
- Was the work verified?
- What durable references exist?
- Is there a reporting/turnover trace?

## Sources

| Source | Used for |
|--------|----------|
| `ApprovalProposal` | Source title/summary, approval status |
| `deriveApprovalExecutionFeedback` | Post-approval execution line |
| `deriveApprovalResultLinks` | Mission artifact paths |
| `ApprovalActivityRecord` | Vault activity JSON reference |
| Optional `BuilderReportEvidenceInput` | build/test/lint verification when provided |
| Capability flags | Reporting turnover / builder report `not_wired` when modules absent |

## UI behavior

- Toggle **View evidence trail** on governed approval cards in Chief → Approvals.
- Demo mode shows `unavailable` with explicit mock warning — no fabricated artifacts.
- Missing vault activity or mission records surface as `not recorded` / warnings.

## Status legend

| Trail status | Meaning |
|--------------|---------|
| `complete` | Approval resolved and expected artifacts/verification recorded |
| `partial` | Some evidence missing or mission incomplete |
| `pending` | Approval still open |
| `unavailable` | Demo mode or cannot compose honest evidence |
