---
name: Supabase conventions
description: TypeScript strictness, Supabase error handling, and response style for this repo
globs: "lib/supabase/**/*.ts,api/**/*.ts"
alwaysApply: true
---

## TypeScript
- `strict` mode is on — never suggest code that needs `any`, non-null assertions (`!`), or
  `// @ts-ignore` to compile.
- Type every Supabase row shape explicitly (see `lib/supabase/admin.ts` for the existing
  `DbTaskRow`/`DbGateRow` pattern) — don't leave query results as untyped `data`.

## Supabase client calls
- Never destructure `{ data, error }` and ignore `error`. Match the existing pattern in
  `lib/supabase/admin.ts`: check `error` immediately and `throw error` (or handle the specific
  Postgres error code, e.g. `23505` for conflicts) — don't swallow it or log-and-continue.
- Always go through `getSupabaseAdmin()` for server-side access; never construct a new
  `createClient(...)` call elsewhere or expose the service role key to client code.
- Default array results with `?? []` rather than assuming a query always returns rows.

## Response style
- Keep responses concise and code-focused. Lead with the code change, not an explanation of what
  Supabase or TypeScript are. Skip preamble ("Great question!", "Let's dive in") and trailing
  summaries unless asked for one.
