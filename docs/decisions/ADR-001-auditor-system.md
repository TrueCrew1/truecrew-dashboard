# True Crew Auditor System

> **Status:** Active  
> **Version:** 1.0  
> **Created:** 2026-07-07  
> **Owner:** TrueCrew1  

---

## 1. Core Role of Each Auditor

### Obsidian Auditor
Curator of the permanent knowledge layer. Ensures the vault stays structured, non-redundant, and actually useful for thinking and building.

### GitHub Repo Auditor
Alignment enforcer between what exists in code, what is documented, and what is decided architecturally.

### Drive / OneDrive Auditor
Excavation and cleanup specialist. Finds buried assets, deletes junk, and flags anything with SaaS potential before it gets lost forever.

### iCloud Capture Auditor
Gatekeeper of the intake buffer. Ensures quick-capture notes are processed and deleted, not stockpiled.

---

## 2. Boundaries and Responsibilities

### Obsidian Auditor
- Owns the vault structure, note naming, linking, and MOC (Map of Content) integrity
- Does not touch raw files in Drive or repos
- Does not hold temporary working documents that belong elsewhere

### GitHub Repo Auditor
- Owns README accuracy, architecture decision records, and implementation-to-documentation consistency
- Does not manage knowledge notes (those belong in Obsidian)
- Does not archive code that still runs in production

### Drive / OneDrive Auditor
- Owns file cleanup, folder structure, and SaaS asset identification
- Does not create permanent documentation (that moves to Obsidian or repo)
- Does not store quick-capture notes (that's iCloud, then Obsidian)

### iCloud Capture Auditor
- Owns the weekly drain of the capture buffer
- Does not store anything permanently
- Does not create structure—only empties into the right place

---

## 3. Weekly Review Checklist

### Obsidian Auditor
- [ ] Check for orphan notes (no links, no MOC)
- [ ] Identify notes older than 30 days that are still stubs
- [ ] Verify top-level MOCs reflect current vault structure
- [ ] Spot duplicate or near-duplicate notes
- [ ] Confirm no raw files or images are living loose in the vault

### GitHub Repo Auditor
- [ ] Compare README against actual project structure and entry points
- [ ] Check for undocumented architectural decisions made in the last week
- [ ] Review open issues for documentation gaps they reveal
- [ ] Verify changelog or decision log is current

### Drive / OneDrive Auditor
- [ ] Scan for newly added files that don't belong in Drive
- [ ] Identify folders that haven't been touched in 90 days
- [ ] Flag anything that looks like an early tool, prototype, or SaaS concept
- [ ] Delete obvious duplicates, downloads, and junk

### iCloud Capture Auditor
- [ ] Review every note in the capture folder
- [ ] Process each one into Obsidian, Drive, repo, or trash
- [ ] Confirm the capture folder is empty at end of session
- [ ] Delete screenshots and voice memos already processed

---

## 4. Delete, Archive, File, Escalate Rules

| Action | Obsidian | GitHub | Drive/OneDrive | iCloud |
|--------|----------|--------|----------------|--------|
| **Delete** | Redundant notes, resolved temporary notes, junk imports | Stale branches (merged), outdated generated docs | Duplicates, downloads folder contents, expired exports | Everything after processing |
| **Archive** | Notes no longer active but historically relevant (move to `Archive/`) | Deprecated project folders, old decision records (move to `archive/` branch or folder) | Old client work, past project materials with no SaaS value | Nothing—iCloud never archives |
| **File** | New permanent notes into correct MOC structure | Updated README sections, new ADRs into `docs/decisions/` | Organized assets into clean Drive folders | N/A |
| **Escalate** | Conflicting ideas that need a decision | Mismatch between docs and code that requires a call | Possible SaaS tools or premium product candidates → tag and report | Urgent ideas that need immediate action |

---

## 5. How Useful Info Moves Into Obsidian

1. Capture arrives via iCloud, direct note, voice memo, or discovery in Drive.
2. Auditor reviews: is this permanent knowledge or a temporary artifact?
3. If permanent knowledge:
   - Create or identify the correct MOC
   - Write or update the note with clear title, links, and source attribution
   - Link from the relevant MOC
4. If it's a file or asset that should stay in Drive: create an Obsidian note that links to the Drive file location.
5. Delete the original capture after confirming the Obsidian note exists.

---

## 6. How Repo Docs Stay Aligned

- After any major implementation change: the developer (you or AI agent) writes a short decision record.
- Weekly auditor checks that the README still describes what the repo actually does.
- Architecture Decision Records (ADRs) live in the repo under `docs/decisions/` and are numbered.
- Obsidian may contain a linked reference note pointing to the ADR, but the source of truth is the repo.
- If Obsidian and the repo disagree: **the repo wins**, and Obsidian gets corrected.

---

## 7. Cleaning Drive/OneDrive While Preserving SaaS Ideas

### Aggressive deletion is the default
- Duplicate files: delete.
- Old downloads folder: empty.
- Client work from years ago with no reuse value: archive or delete.
- Screenshots and memes: delete.

### SaaS identification protocol
When reviewing, ask of each old tool, spreadsheet, prototype, or script:
- Could this solve a problem someone would pay for?
- Is it self-contained enough to package?
- Did I already build something similar that validates the concept?

If **yes**:
- Move the file to `Drive/Business/SaaS Ideas/[Tool Name]/`
- Create an Obsidian note under `Projects/SaaS Ideas/` summarizing what it does, what state it's in, and why it has potential
- Tag it `#saas-idea` and `#excavated`

If **no but it might be useful later**:
- Archive to `Drive/Archive/`

---

## 8. How iCloud Stays Mostly Empty

> **Rule: iCloud is a pipe, not a bucket.**

- All capture goes into a single folder called `Inbox` (Apple Notes or Files).
- The auditor processes the Inbox weekly until empty.
- No subfolders. No organization. No permanent storage.
- After processing, every item is deleted from iCloud.
- The only exception: if you're mid-flight and can't process, notes wait until the next audit session.

---

## 9. Suggested Folder Logic

### Obsidian Vault Structure
```
/Inbox            (temporary holding for unprocessed captures)
/MOCs             (Maps of Content—one per major domain)
/Projects
  /Active
  /SaaS Ideas
  /Archive
/Areas            (ongoing responsibilities)
/Resources        (reference material, external knowledge)
/Archive          (inactive but preserved notes)
/System           (templates, auditor logs, meta)
```

### Google Drive / OneDrive Structure
```
/Business
  /SaaS Ideas
    /[Tool Name]
  /Admin
  /Financial
/Projects
  /Active
  /Archive
/Personal
/Archive
```
> No nesting deeper than three levels unless there's a specific reason.

### GitHub Repo Documentation
```
/docs
  /decisions       (ADRs)
  /architecture    (diagrams, overviews)
README.md
CONTRIBUTING.md    (if applicable)
CHANGELOG.md
```

---

## 10. Operating Rules to Prevent Overlap and Clutter

1. **Source of truth by domain:**
   - Knowledge, ideas, thinking → Obsidian
   - Code, architecture, implementation decisions → GitHub repo
   - Files, assets, business documents → Drive/OneDrive
   - Temporary capture → iCloud (and only temporarily)

2. **No duplication across surfaces.** If a file is in Drive, Obsidian links to it—it does not store a copy.

3. **One inbox at a time.** All intake flows through iCloud or direct Obsidian capture, not Drive.

4. **Auditors do not create content for other auditors.** The Drive auditor flags a SaaS idea—it creates an Obsidian link, not a full document in Drive.

5. **Archive before delete when uncertain.** But default to delete for anything clearly junk.

6. **Weekly rhythm is non-negotiable.** Each auditor runs once per week. Skipping leads to drift, then mess, then avoidance.

7. **Tag consistently.** Use `#saas-idea`, `#excavated`, `#archive`, `#needs-decision` across Obsidian and Drive descriptions so filters work everywhere.

8. **iCloud is sacred emptiness.** If iCloud has more than 10 items at audit time, something is wrong.
