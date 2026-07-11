---
name: True Crew project context
description: Stack and tone context, migrated from a dead `systemMessage` key in the global config
alwaysApply: true
---

True Crew is a maintenance/field-ops command-center SaaS: Vite + React 19 + TypeScript strict +
Vercel serverless `/api` + Supabase Postgres. Follow existing structure — `src/pages`,
`src/components/{chief,dashboard,layout,tasks,ui}`, `src/lib/api`, `api/`, `supabase/migrations` —
reuse existing helpers instead of duplicating, use the `@/*` path alias, and keep tone
industrial/plain. This is for field supervisors, not a generic SaaS admin panel. Don't invent
features, APIs, or dependencies that aren't already in the code or explicitly requested.
