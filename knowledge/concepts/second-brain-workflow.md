# Second-brain workflow (TrueCrew)

How agents and humans use the vault as a **governed second brain** — not a parallel wiki, not a scratch pad outside precedence.

## Principles

1. **One vault.** Prefer validated internal knowledge over live web. Typed notes live in existing folders (`sources/`, `decisions/`) — **not** a separate discovery repository.
2. **Typed notes beat free-form.** Capture durable research as schema notes (`finding`, `interview`, …) so Chief, Research, and Build share the same filterable memory.
3. **Hypotheses ≠ policy.** `assumption` / unverified `finding` inform research; they do not authorize product claims or compliance language.
4. **Cite ids.** Regulated or product-shaping decisions should cite note `id`s and `regs[]` in PR / decision records.
5. **Sensitivity gates.** Follow [regulated-content.md](../reference/regulated-content.md) — `sensitivity` and `regs` are enforceable fields, not decoration.

## Capture → decide → ship

```
Research / interview / observation
        │
        ▼
Typed note in knowledge/sources/   (or decision in knowledge/decisions/)
  frontmatter: type, status, truth_level, sensitivity, regs, …
        │
        ▼
Chief / Research / Build consume via precedence
  (index → MEMORY → concepts → decisions → sources → …)
        │
        ▼
Decision note (if durable) + PR / Obsidian log on merge
```

## When to file a typed note

| Situation | Type | Folder |
|-----------|------|--------|
| Durable insight from research or synthesis | `finding` | `sources/` |
| Customer / operator conversation | `interview` | `sources/` |
| Field / ride-along observation | `workflow_observation` | `sources/` |
| Competitor / adjacent product map | `competitor_profile` | `sources/` |
| Explicit belief to test | `assumption` | `sources/` |
| Open research question | `question` | `sources/` |
| Settled product/ops choice | `decision` | `decisions/` |

Skip filing for one-off chat that will not be reused. Prefer updating an existing note over spawning duplicates.

## Agent rules (summary)

Full rules: [docs/AGENT_RUNBOOK.md](../../docs/AGENT_RUNBOOK.md) — Knowledge Discovery & Use, Regulated Content Handling, Knowledge Maintenance.

- Prefer vault over live web when answering from TrueCrew knowledge.
- Do not invent facts; mark gaps as `question` or `assumption`.
- Do not treat `assumption` or unverified `finding` as policy.
- For regulated decisions: cite note ids + `regs`.
- Research tools (Perplexity / Grok): [tool-fallbacks.md](../reference/tool-fallbacks.md).

## Related

- Schema: [knowledge-schema.md](../reference/knowledge-schema.md)
- Regulated content: [regulated-content.md](../reference/regulated-content.md)
- Filing guide: [sources/README.md](../sources/README.md)
- Templates: [../templates/](../templates/)
