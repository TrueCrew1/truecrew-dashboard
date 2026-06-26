# True Crew — Command Center

Premium desktop command center for running business operations end-to-end.

## Stack

- Vite + React 19 + TypeScript
- React Router 7
- Netlify (SPA deploy)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Routes

| Path | Module |
|---|---|
| `/` | Today |
| `/dashboard` | Dashboard |
| `/operations` | Operations |
| `/builds` | Builds |
| `/monitor` | Monitor |
| `/repair` | Repair |
| `/customers` | Customers |
| `/knowledge` | AI & Knowledge |
| `/review` | Review |
| `/settings` | Settings |

## Entity types

`Task`, `Workflow`, `Incident`, `Tool`, `Deploy`, `Customer`, `Runbook`, `Prompt`, `Note`

## Workflow stages

Inbox → Triage → Planned → In Progress → Waiting → Review → Done → Logged

Mock seed data lives in `src/data/mockData.ts`.

## Legacy prototype

The original monolithic HTML prototype is preserved at `index.legacy.html`.
