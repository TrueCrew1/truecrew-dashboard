# Research Runner — continuous research contract

How approved research gets executed continuously without an operator babysitting it,
while every gate in `docs/AGENT_WORKFLOW.md` stays intact.

## The loop

```
operator approves "Start research: <topic>" card   (Chief Approvals board)
        │  ChiefApprovalsContext releases the queue row: queued → in_progress
        ▼
runner picks up ONE in_progress request per run
        │  research: web search + repo/vault context
        ▼
files a PROVISIONAL findings note (sources cited) at the request's target path
        │  opens a PR — this is the human quality gate
        ▼
PATCH /api/research/:id → done + filedPath     (or blocked + blocker note)
        ▼
queue, Knowledge status card, and V2 program cards update themselves
```

Two human gates, no babysitting between them: the **approval** starts work, the
**PR review** accepts it. The runner never picks its own topics, never files
anything above `provisional` trust, and never marks `done` without a filed path
(the status machine in `lib/research/status.ts` enforces that server-side).

## Executor and tool access

| Tool | Cost lane | Role |
|---|---|---|
| Scheduled Claude Code cloud agent | Claude subscription (premium) | **Primary runner.** Web search + fetch, full repo checkout, writes finding notes, opens PRs |
| Azure OpenAI (GPT-5-mini / Codex lane) | Azure credits (active) | In-app synthesis — `lib/azureAi/client.ts`, `api/chief/ask.ts`. Optional summarization sub-step |
| Ollama (`lib/ollama/researchHelper.ts`) | Free, local | Prep-only summarize/extract when working locally; never files or decides |
| Perplexity Pro | Browser account (manual) | Deep-dive lane for the operator; hand results to the runner as source text |
| Perplexity API | **Optional, not provisioned** | If enabled later: set `PERPLEXITY_API_KEY` in the runner env. Off until explicitly re-enabled per `~/.claude/CLAUDE.md` tool governance |

The scheduled Claude agent already carries the premium research toolset (search,
fetch, repo, PRs) — no new API keys are required for the primary loop.

## Runner environment contract

To read and update the live queue, the runner needs:

- `TRUECREW_API_URL` — deployed app origin (e.g. `https://<app>.vercel.app`)
- `TRUECREW_INTERNAL_KEY` — value of `INTERNAL_API_SECRET` (same `x-internal-key`
  header every internal route uses)

Endpoints: `GET /api/research` (list), `PATCH /api/research/:id`
(`{status, filedPath?, blockerNote?}` — transitions validated server-side).

**Fallback when the API is unreachable or keys aren't configured:** the repo
itself is the signal. A finding scaffold under `knowledge/findings/m-and-s/`
whose *Findings* section still says "None filed yet" and whose request the
operator approved is researchable; the runner fills the note and opens the PR,
and the operator (or a later webhook) flips the queue status. Degraded but
honest — nothing pretends to be synced.

## Per-run rules (guardrails)

1. **One topic per run.** Pick the oldest `in_progress` request; ignore the rest.
2. **Only operator-released topics.** `in_progress` means an approval put it
   there. Never touch `queued` rows.
3. **Cite everything.** Findings carry their sources; claims verifiable against
   a product page/docs are marked as such, roundup-sourced claims stay `reported`.
4. **File `provisional`, always.** Trust is raised by the operator after PR
   review, per the vault rules (`knowledge/concepts/second-brain-workflow.md`).
5. **Fail loudly.** Can't finish → `blocked` with a real blocker note, PR left
   as draft or closed. No silent retries, no half-filed notes marked done.
6. **Respect the templates.** Fill the existing scaffold (Open questions →
   Findings → Sources consulted); don't restructure vault files.
7. **One PR per finding**, using `docs/PR_SUMMARY_TEMPLATE.md`.

## What this deliberately is not

- Not an auto-approver: nothing enters `in_progress` without an operator click.
- Not a trust-setter: `verified`/`cited` upgrades stay human decisions.
- Not a fleet: one scheduled runner, one topic per run. Scale cadence, not
  concurrency, if throughput is short.

## Ops to run

- Apply the queue migration if not yet applied: `npm run db:push`
- Configure the scheduled agent's env (`TRUECREW_API_URL`, `TRUECREW_INTERNAL_KEY`)
  for live status sync; without them the runner uses the repo-native fallback above.
