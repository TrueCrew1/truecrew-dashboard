# AnythingLLM — `SaaS-Dev` workspace config

One-screen reference for setting up the `SaaS-Dev` workspace in the AnythingLLM GUI.
Type these values in as-is — nothing here needs judgment calls.

## SaaS-Dev setup — quick checklist

- [ ] Create workspace `SaaS-Dev` in AnythingLLM.
- [ ] Set LLM provider to Ollama (`http://127.0.0.1:11434`, model `qwen2.5-coder:14b`).
- [ ] Set embedder to Ollama (`http://127.0.0.1:11434`, model `nomic-embed-text`).
- [ ] Import Obsidian vault:
  `/Users/truecrew/Documents/TrueCrew/Obsidian Vaults/TrueCrew Second Brain`
- [ ] Import SaaS docs:
  `/Users/truecrew/truecrew-dashboard/docs`
- [ ] Assign both sources to `SaaS-Dev` and run embeddings until complete.

### Validation prompts (run in SaaS-Dev)

1. Priorities:
   - Prompt: "What are the three goals listed in Chief/Priorities.md, and what's the third one called?"
   - Grounded if:
   - It names the real goals and treats blocker/next-slice as `{{...}}` templates.
2. Research Queue:
   - Prompt: "According to AGENT_RUNBOOK.md, what is the Research Queue and where does an entry go after it's filed?"
   - Grounded if:
   - It describes Queued → drafts/ → filed knowledge/sources/ → move queue entry to Filed.

## 1. Workspace identity

- **Name:** `SaaS-Dev`
- **Purpose:** local agent workspace for TrueCrew SaaS dev — vault + repo docs +
  Drive, Ollama-only, no external API calls.

## 2. LLM provider

- **Provider:** `Ollama`
- **Base URL:** `http://127.0.0.1:11434`
- **Chat model:** `qwen2.5-coder:14b` (primary)
- **Fallback model:** `llama3.1:8b` (use if `14b` is too slow on this machine)

## 3. Embedder

- **Provider:** `Ollama`
- **Base URL:** `http://127.0.0.1:11434`
- **Embedding model:** `nomic-embed-text` (shows as `nomic-embed-text:latest` in the
  Ollama model list — either form should resolve to the same model)

## 4. Data sources — import & embed these three folders

- **Obsidian vault:**
  `/Users/truecrew/Documents/TrueCrew/Obsidian Vaults/TrueCrew Second Brain`
- **Repo docs:**
  `/Users/truecrew/truecrew-dashboard/docs`
- **Google Drive (TrueCrew folder):**
  `/Users/truecrew/Library/CloudStorage/GoogleDrive-contact@truecrewllc.com/My Drive/TrueCrew`

  > ⚠️ **Known issue, checked today:** the three files currently in this folder
  > (`TRUECREW_PROJECT_CONTEXT.gdoc`, `TRUECREW_CLAUDE_PROJECT_INSTRUCTIONS.gdoc`,
  > `TrueCrew_Website_Strategy.gdoc`) are **cloud-only pointer stubs** (~178 bytes,
  > just a JSON `doc_id`), not real text. AnythingLLM will embed the JSON, not the
  > document content — question 3 below is expected to fail until this is fixed.
  > **Fix:** open each in Google Docs → File → Download → Markdown (.md) or
  > plain text (.txt) → save the export into this same folder → re-embed.

## 5. Validation prompts

Run all five in the `SaaS-Dev` chat after embedding finishes.

1. **Vault** — *"What are the four priority slices in Chief/Priorities.md, and are
   the blocker/next-slice fields filled in or still template placeholders?"*
   Correct answer names all four slices (dashboard core, second-brain research
   loop, M&S Painting v2, marketing site relaunch) and says the blocker/next-slice
   fields are still unfilled `{{...}}` placeholders.

2. **Runbook** — *"Per docs/AGENT_RUNBOOK.md, what four agents do the work, and
   who is the only path from an agent's output to the operator's decision?"*
   Correct answer: Planner, Build, Research, Content do the work; **Chief** is the
   only path to the operator, via an `ApprovalCard` — may also mention Reliability
   as a defined-but-reserved sixth role.

3. **Cloud-mirror** — *"What does TRUECREW_PROJECT_CONTEXT say about the project?"*
   Expected **today**: no real answer / a raw `doc_id` JSON blob — proves the Drive
   stub-file issue above rather than the model hallucinating. Re-run after the fix
   in §4 and expect a real, specific answer instead.

4. **Cross-source** — *"How does the 'second-brain research loop' priority in
   Chief/Priorities.md connect to the scripts described in docs/SECOND-BRAIN.md?"*
   Correct answer ties priority #2's goal (Obsidian + repo drafts + canonical
   filing as a repeatable system) to the actual `npm run obsidian:log` subcommands
   (`build`, `decision`, `pr`, `hot-context`, `artifact`) and the vault-path table.

5. **Config sanity** — *"Per docs/AGENT_RUNBOOK.md's Chief Intake Rule, what four
   things does Chief read, in order, before any planning or execution?"*
   Correct answer, in order: `knowledge/MEMORY.md` → `True Crew/Master Priority
   List.md` → `01_DASHBOARD/Current Priority List.md` → the active-task doc. A
   vague or generic answer means the repo-docs source isn't actually embedded —
   also check the workspace header shows the `Ollama` model chip, not a
   "no model set" placeholder.

## 6. Manual steps (click/type order)

1. **New Workspace** → name it `SaaS-Dev`.
2. Workspace **Settings → Chat** → set LLM provider to `Ollama`, base URL
   `http://127.0.0.1:11434`, model `qwen2.5-coder:14b`.
3. Workspace **Settings → Embedder** → provider `Ollama`, same base URL, model
   `nomic-embed-text`.
4. **Documents** → add the three folders in §4 → select all → **Move to workspace**
   → **Save and Embed**. Wait for embedding to finish before testing.
5. Open the workspace chat and run the five prompts in §5, in order.
