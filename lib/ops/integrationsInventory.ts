import type { IntegrationInventoryEntry } from "./types.js";

/**
 * V1 integrations inventory for services the dashboard actually touches.
 */
export const INTEGRATIONS_INVENTORY: readonly IntegrationInventoryEntry[] = [
  {
    id: "supabase",
    serviceName: "Supabase Postgres",
    purpose: "Live tasks/workflows, Chief approval decisions, mission context queries.",
    usedIn: [
      "lib/supabase/",
      "api/chief/approvals/index.ts",
      "api/research/dispatch.ts",
      "api/monitor/index.ts?target=supabase",
    ],
    envDependencies: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    status: "active",
    failureBehavior:
      "API routes return 503 when unconfigured; UI falls back to mock data when VITE_USE_LIVE_API is false.",
    operatorRole: "founder",
    notes: "Client anon key env vars exist for future auth but are not used by the v1 API layer.",
  },
  {
    id: "vercel",
    serviceName: "Vercel (hosting + deploy API)",
    purpose: "Hosts the SPA and serverless /api routes; optional deploy health probe.",
    usedIn: ["vercel.json", "api/monitor/index.ts?target=vercel", ".github/workflows/"],
    envDependencies: [
      "VERCEL_API_TOKEN",
      "VERCEL_PROJECT_ID",
      "INTERNAL_API_SECRET",
      "VITE_INTERNAL_KEY",
    ],
    status: "active",
    failureBehavior:
      "Deploy monitor returns ok:false when tokens missing; preview env may 401 internal APIs by design.",
    operatorRole: "founder",
    notes: "See knowledge/decisions/vercel-preview-secret-scope.md for preview INTERNAL_API_SECRET scope.",
  },
  {
    id: "obsidian-vault",
    serviceName: "Obsidian vault (local filesystem)",
    purpose:
      "Durable approval activity, governed mission artifacts, build/decision logs, and librarian outputs.",
    usedIn: [
      "lib/obsidian/",
      "lib/approvals/approvalActivityStore.ts",
      "lib/missions/*Store.ts",
      "lib/librarian/create.ts",
    ],
    envDependencies: ["OBSIDIAN_VAULT_PATH"],
    status: "partial",
    failureBehavior:
      "Server paths skip vault writes when unset; missions/activity APIs return empty or partial results with explicit notes.",
    operatorRole: "founder",
    notes: "Not available on Vercel production runtime — local/dev operator machine only.",
  },
  {
    id: "slack",
    serviceName: "Slack (outbound webhook)",
    purpose:
      "Governed-loop notifications (approvals, missions, monitor state) and manual daily turnover posts.",
    usedIn: [
      "lib/governedLoopSlack.ts",
      "api/chief/approvals/index.ts",
      "src/lib/api/governedSlackNotify.ts",
    ],
    envDependencies: ["SLACK_WEBHOOK_URL"],
    status: "partial",
    failureBehavior:
      "When unset or failing, governedLoopSlack no-ops or console.warns; core approvals/missions unaffected.",
    operatorRole: "operator",
    notes: "Inbound Slack commands/approvals are not wired — human coordination only.",
  },
  {
    id: "github",
    serviceName: "GitHub (webhooks + CLI workflow)",
    purpose: "PR/CI gate automation via signed webhook; human/agent git operations outside the app.",
    usedIn: ["api/github/webhook.ts", ".github/workflows/ci.yml"],
    envDependencies: ["GITHUB_WEBHOOK_SECRET"],
    status: "partial",
    failureBehavior:
      "Webhook rejects unsigned payloads; CI status is not surfaced in Monitor or turnover messages.",
    operatorRole: "founder",
    notes: "No in-app GitHub API client — gh CLI used in runbooks only.",
  },
  {
    id: "azure-openai",
    serviceName: "Azure OpenAI (LLM router)",
    purpose: "Research/Builder/Chief LLM tasks via server router (DeepSeek/Kimi/GPT tiers on Azure).",
    usedIn: ["src/llm/router.ts", "lib/llm/index.ts", "api/llm/suggest-tests.ts"],
    envDependencies: ["AZURE_OPENAI_API_KEY", "AZURE_AI_RESOURCE_ENDPOINT"],
    status: "partial",
    failureBehavior:
      "Mission runners and suggest-tests return blocked/failed states when Azure env missing or LLM errors.",
    operatorRole: "founder",
    notes: "Legacy direct API keys in .env.example are unused by the current router.",
  },
  {
    id: "ollama",
    serviceName: "Ollama (local)",
    purpose: "Optional Tier-1 Librarian refinement on operator machine.",
    usedIn: ["lib/librarian/ (when enabled)", "docs/AI_STACK.md"],
    envDependencies: ["LIBRARIAN_AI_ENABLED", "OLLAMA_HOST", "OLLAMA_MODEL"],
    status: "partial",
    failureBehavior: "Librarian falls back to deterministic refinement when disabled or unreachable.",
    operatorRole: "operator",
    notes: "Not used by governed Research missions in production API paths.",
  },
  {
    id: "vercel-mcp",
    serviceName: "Vercel MCP (editor)",
    purpose: "Cursor/Claude editor tooling for deploy inspection — not part of app runtime.",
    usedIn: [".cursor/mcp.json", "docs/AI_STACK.md#vercel-mcp"],
    envDependencies: [],
    status: "partial",
    failureBehavior:
      "Editor MCP unavailable until authenticated in Cursor; no impact on deployed app behavior.",
    operatorRole: "founder",
    notes: "MCP discipline: read-only deploy checks preferred; no automatic production deploys from agents.",
  },
  {
    id: "google-drive-workspace",
    serviceName: "Google Drive workspace paths",
    purpose: "Planned Drive → workspace → Obsidian triage (documented, not product-wired on main).",
    usedIn: ["docs/V1_TRUTH_MAP.md", "docs/decisions/ADR-001-auditor-system.md"],
    envDependencies: [],
    status: "not_wired",
    failureBehavior: "No runtime integration — references are documentation/runbook only on current main.",
    operatorRole: "founder",
    notes: "Do not assume mounted Drive paths in production dashboard code.",
  },
  {
    id: "internal-api-auth",
    serviceName: "Internal API auth",
    purpose: "Protects /api routes via x-internal-key matching INTERNAL_API_SECRET.",
    usedIn: ["lib/auth.ts", "api/health.ts", "src/lib/api/client.ts"],
    envDependencies: ["INTERNAL_API_SECRET", "VITE_INTERNAL_KEY"],
    status: "active",
    failureBehavior: "Missing/mismatched key returns 401 JSON on protected routes.",
    operatorRole: "founder",
    notes: "Client key is visible in bundle — gates API access, not a substitute for deployment protection.",
  },
];
