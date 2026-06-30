import { useEffect, useState } from "react";
import { PageHeader, Panel, StatusBadge } from "@/components/ui";
import { fetchHealth, isLiveApiEnabled } from "@/lib/api/client";
import { WORKFLOW_STAGES } from "@/types";

const SETTINGS_TABLE = "table-scroll";

export function SettingsPage() {
  const [health, setHealth] = useState<{
    supabase: boolean;
    githubWebhook: boolean;
    host?: string;
    liveApi?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isLiveApiEnabled()) return;
    fetchHealth()
      .then((result) => setHealth(result))
      .catch(() => setHealth(null));
  }, []);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Stage-gate rules, routing configuration, users, and integrations"
      />

      <div className="page-stack">
        <div className="grid-2">
          <Panel title="Workflow stages">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {WORKFLOW_STAGES.map((stage, i) => (
                  <tr key={stage}>
                    <td>{i + 1}</td>
                    <td>{stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Integrations">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Integration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Supabase</td>
                  <td>
                    {health?.supabase ? (
                      <StatusBadge status="Connected" variant="green" />
                    ) : (
                      <span style={{ color: "var(--steel-dim)" }}>Not configured</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>GitHub webhook</td>
                  <td>
                    {health?.githubWebhook ? (
                      <StatusBadge status="Configured" variant="green" />
                    ) : (
                      <span style={{ color: "var(--steel-dim)" }}>Not configured</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Obsidian vault</td>
                  <td style={{ color: "var(--steel-dim)" }}>Phase C — not connected</td>
                </tr>
              </tbody>
            </table>
          </Panel>
        </div>

        <Panel title="Deployment">
          <div className={SETTINGS_TABLE}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Host</td>
                  <td className="mono">Vercel (SPA + /api routes)</td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td className="mono">Supabase Postgres</td>
                </tr>
                <tr>
                  <td>Host</td>
                  <td className="mono">{health?.host ?? "unknown"}</td>
                </tr>
                <tr>
                  <td>Live API</td>
                  <td className="mono">
                    {health?.liveApi ? "enabled" : isLiveApiEnabled() ? "pending deploy" : "mock mode"}
                  </td>
                </tr>
                <tr>
                  <td>Webhook endpoint</td>
                  <td className="mono">POST /api/github/webhook</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Personas & permissions">
          <div className={SETTINGS_TABLE}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Founder</td>
                  <td style={{ color: "var(--steel-dim)" }}>
                    Full read/write/admin; can override stage gates
                  </td>
                </tr>
                <tr>
                  <td>Operator</td>
                  <td style={{ color: "var(--steel-dim)" }}>
                    Execute workflows; cannot edit rules or delete entities
                  </td>
                </tr>
                <tr>
                  <td>Observer</td>
                  <td style={{ color: "var(--steel-dim)" }}>
                    Read-only dashboards and service catalog
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
