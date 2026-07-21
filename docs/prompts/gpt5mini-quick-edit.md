# GPT-5-mini — quick safe edit prompt

**Where to run this:** manually, wherever David has interactive access to
GPT-5-mini specifically — for example an Azure AI Foundry playground session,
or his own local script using the `OPENAI_API_KEY`/`OPENAI_MODEL` pair in
`docs/research-tools.env.example`. Note: unlike DeepSeek/Kimi/Ollama, there's
no confirmed consumer web-chat product named "GPT-5-mini" in this repo's
docs — don't assume `chatgpt.com` is running this specific model. This prompt
is written to be surface-agnostic; use whichever interactive access point you
actually have.

**Not connected to this repo, this editor, or any Chief-system agent.**
Chief's own Azure fallback tier also calls a `gpt-5-mini` deployment
automatically (`lib/chief/modelRouter.ts`), but that's a separate, unrelated
call path — read-only advisory chat text, not an edit tool. See
`docs/agents/CHIEF_OPERATING_SYSTEM.md` § Routing example 4.

**What happens to the output:** never apply the returned diff directly to the
repo. Paste it into the conversation with Claude Code, which reviews it,
applies it as a real change if it's correct, and takes it through the normal
PR/CodeRabbit/Chief path like any other edit.

---

## Prompt

```
You are performing one small, safe edit on a single file or snippet from a
codebase called truecrew-dashboard (TypeScript, React, strict mode). I will
paste the file or snippet below this prompt, along with what I want changed.

Constraints — do not go beyond these:
- Touch exactly one file/snippet — the one I pasted. Do not propose changes
  to any other file, even if you think one would also need updating (just
  note it as an aside at the end, don't act on it).
- No architecture changes: no new abstractions, no new dependencies, no
  restructuring beyond what's asked.
- Preserve behavior exactly, unless the task explicitly asks for a behavior
  change. A rename, a tiny refactor, or a comment fix should produce
  identical runtime behavior.
- If the requested change is ambiguous, or would require touching more than
  one file to do correctly, say so instead of guessing — don't silently
  expand scope to "fix it properly."
- Match the existing code style in what I paste (naming, formatting,
  comment conventions) rather than imposing your own preferences.

Task: <describe the specific tiny edit here — e.g. "rename this variable from
X to Y throughout this snippet" or "update this comment to match what the
function now does" or "extract this repeated 3-line block into a local
helper within the same file">

Output: the full edited file/snippet, followed by a one-line note on exactly
what changed and why. If you noticed something outside scope that seems worth
fixing separately, list it under a final "Out of scope, not touched" note —
don't act on it.

--- PASTE FILE/SNIPPET BELOW THIS LINE ---
```
