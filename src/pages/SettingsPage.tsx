import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Panel, PanelEmpty, StatusBadge, TableScroll, TableText } from "@/components/ui";
import { useChiefApprovals } from "@/components/chief/ChiefApprovalsContext";
import { proposeContentApiDocsFix } from "@/components/chief/contentApiDocsProposal";
import { useData } from "@/context/DataContext";
import { fetchHealth, isLiveApiEnabled } from "@/lib/api/client";
import { WORKFLOW_STAGES } from "@/types";

type ContentSignalFeedback = "queued" | "already_pending" | "no_signal" | null;

export function SettingsPage() {
  const { source } = useData();
  const { approvals, addCommandApproval } = useChiefApprovals();
  const liveApi = isLiveApiEnabled();
  const [healthLoading, setHealthLoading] = useState(liveApi);
  const [health, setHealth] = useState<{
    supabase: boolean;
    githubWebhook: boolean;
    host?: string;
    liveApi?: boolean;
  } | null>(null);
  const [contentSignalFeedback, setContentSignalFeedback] =
    useState<ContentSignalFeedback>(null);

  function handleProposeContentApiDocsFix() {
    const result = proposeContentApiDocsFix(liveApi, approvals);
    if (result.outcome === "queued") {
      addCommandApproval(result.card);
    }
    setContentSignalFeedback(result.outcome === "blocked" ? "already_pending" : result.outcome);
  }

  useEffect(() => {
    if (!liveApi) {
      setHealthLoading(false);
      return;
    }

    setHealthLoading(true);
    fetchHealth()
      .then((result) => setHealth(result))
      .catch(() => setHealth(null))
      .finally(() => setHealthLoading(false));
  }, [liveApi]);

  const integrationsReachable = health !== null;

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Deployment reference, integrations, and persona permissions"
      />

      {!liveApi ? (
        <div className="settings-mode-banner" role="status">
          <span aria-hidden="true">ℹ</span>
          <p>
            <strong>Mock mode.</strong> Integration status reflects local configuration only.
            Enable the live API to verify Supabase and GitHub webhook connectivity against Netlify.
          </p>
        </div>
      ) : null}

      <div className="page-stack">
        <div className="grid-2">
          <Panel title="Workflow stages">
            <TableScroll label="Workflow stage order reference table.">
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col" className="col-order">
                      Order
                    </th>
                    <th scope="col">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {WORKFLOW_STAGES.map((stage, i) => (
                    <tr key={stage}>
                      <td className="cell-muted">{i + 1}</td>
                      <td>{stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Panel>

          <Panel title="Integrations">
            {healthLoading ? (
              <div className="settings-health-loading" aria-live="polite" aria-busy="true">
                Checking integration health…
              </div>
            ) : !liveApi ? (
              <TableScroll label="Integration status reference (mock mode).">
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col">Integration</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Supabase</td>
                      <td className="cell-muted">Local mock — not checked</td>
                    </tr>
                    <tr>
                      <td>GitHub webhook</td>
                      <td className="cell-muted">Local mock — not checked</td>
                    </tr>
                    <tr>
                      <td>Obsidian vault</td>
                      <td className="cell-muted">Phase C — not connected</td>
                    </tr>
                  </tbody>
                </table>
              </TableScroll>
            ) : !integrationsReachable ? (
              <PanelEmpty
                emptyKey="settings-health"
                title="Could not reach health endpoint"
                description="The /api/health check failed. Confirm the API is deployed and environment variables are set."
                action={
                  <Link to="/" className="empty-state-link">
                    Return to Today
                  </Link>
                }
              />
            ) : (
              <TableScroll label="Integration status table.">
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col">Integration</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Supabase</td>
                      <td>
                        {health?.supabase ? (
                          <StatusBadge status="Connected" variant="green" />
                        ) : (
                          <span className="cell-muted">Not configured</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>GitHub webhook</td>
                      <td>
                        {health?.githubWebhook ? (
                          <StatusBadge status="Connected" variant="green" />
                        ) : (
                          <span className="cell-muted">Not configured</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Obsidian vault</td>
                      <td className="cell-muted">Phase C — not connected</td>
                    </tr>
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </div>

        <Panel title="Deployment">
          <TableScroll
            wide
            stickyFirst
            label="Deployment settings table; scroll horizontally on smaller screens to read full values."
          >
            <table className="data-table data-table--comfortable">
              <thead>
                <tr>
                  <th scope="col">Setting</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Platform</td>
                  <td className="cell-mono cell-truncate" title="Netlify (SPA + serverless functions)">
                    Netlify (SPA + serverless functions)
                  </td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td className="cell-mono">Supabase Postgres</td>
                </tr>
                <tr>
                  <td>Runtime host</td>
                  <td>
                    <TableText
                      value={
                        healthLoading && liveApi
                          ? "Checking…"
                          : health?.host ?? (liveApi ? undefined : "mock — no host")
                      }
                      fallback="Unknown"
                      mono
                      truncate
                    />
                  </td>
                </tr>
                <tr>
                  <td>Data source</td>
                  <td className="cell-mono">{source}</td>
                </tr>
                <tr>
                  <td>Live API</td>
                  <td className="cell-mono">
                    {health?.liveApi
                      ? "enabled"
                      : liveApi
                        ? "pending deploy"
                        : "mock mode"}
                  </td>
                </tr>
                <tr>
                  <td>Webhook endpoint</td>
                  <td className="cell-mono cell-truncate" title="POST /api/github/webhook">
                    POST /api/github/webhook
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <Panel
          title="Content: README API docs check"
          action={
            <button
              type="button"
              className="empty-state-link"
              onClick={handleProposeContentApiDocsFix}
            >
              Check README against live routes
            </button>
          }
        >
          <p className="cell-muted">
            README&apos;s public API routes table omits <code>/api/chief/approvals</code> — the
            route this app&apos;s own client actually calls for Chief approval decisions. When
            live API mode is on, Content files a doc-accuracy proposal into Chief&apos;s approval
            queue. Review on Chief &rarr; Approvals.
          </p>
          {contentSignalFeedback === "queued" ? (
            <p className="cell-muted" role="status">
              Queued for operator approval — open Chief &rarr; Approvals to decide.
            </p>
          ) : null}
          {contentSignalFeedback === "already_pending" ? (
            <p className="cell-muted" role="status">
              Already awaiting approval — review the pending proposal on Chief &rarr; Approvals.
            </p>
          ) : null}
          {contentSignalFeedback === "no_signal" ? (
            <p className="cell-muted" role="status">
              Mock mode — /api/chief/approvals isn&apos;t live traffic right now, so there&apos;s
              nothing to flag. Enable live API mode to check this for real.
            </p>
          ) : null}
        </Panel>

        <Panel title="Personas & permissions">
          <TableScroll
            wide
            stickyFirst
            label="Persona permissions table; scroll horizontally on smaller screens to read full access descriptions."
          >
            <table className="data-table data-table--comfortable">
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Access</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Founder</td>
                  <td className="cell-muted cell-clamp-2">
                    Full read/write/admin; can override stage gates
                  </td>
                </tr>
                <tr>
                  <td>Operator</td>
                  <td className="cell-muted cell-clamp-2">
                    Execute workflows; cannot edit rules or delete entities
                  </td>
                </tr>
                <tr>
                  <td>Observer</td>
                  <td className="cell-muted cell-clamp-2">
                    Read-only dashboards and service catalog
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
        </Panel>
      </div>
    </>
  );
}
