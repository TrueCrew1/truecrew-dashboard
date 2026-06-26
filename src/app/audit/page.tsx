"use client";

import { PageHeader, Panel, StatGrid, StatusBadge, formatRelativeTime } from "@/components/ui";
import { useData } from "@/context/DataContext";

const auditEvents = [
  {
    id: "audit-1",
    action: "Gate passed",
    actor: "github-webhook",
    target: "PR #142 — CI green",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    level: "info" as const,
  },
  {
    id: "audit-2",
    action: "Incident opened",
    actor: "monitor",
    target: "API latency spike — Sev 2",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    level: "warning" as const,
  },
  {
    id: "audit-3",
    action: "Deploy promoted",
    actor: "founder",
    target: "true-crew v0.2.0 → production",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    level: "info" as const,
  },
  {
    id: "audit-4",
    action: "Task stage changed",
    actor: "system",
    target: "Repair workflow → In Progress",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    level: "info" as const,
  },
  {
    id: "audit-5",
    action: "Gate blocked",
    actor: "github-webhook",
    target: "PR #138 — review required",
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    level: "warning" as const,
  },
];

export default function AuditPage() {
  const { data } = useData();

  const alertCount = data.alerts.length;
  const incidentCount = data.incidents.filter((i) => i.status !== "resolved").length;

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of system events, gate changes, and operator actions"
      />

      <StatGrid
        stats={[
          { label: "Events (sample)", value: auditEvents.length, meta: "Recent activity" },
          { label: "Alerts logged", value: alertCount, meta: "Active notifications" },
          { label: "Incidents tracked", value: incidentCount, meta: "Open + resolved" },
          { label: "Retention", value: "90d", meta: "Configurable policy" },
        ]}
      />

      <Panel title="Event stream">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {auditEvents.map((event) => (
              <tr key={event.id}>
                <td className="mono">{formatRelativeTime(event.timestamp)}</td>
                <td>{event.action}</td>
                <td style={{ color: "var(--steel-dim)" }}>{event.actor}</td>
                <td>{event.target}</td>
                <td>
                  <StatusBadge
                    status={event.level}
                    variant={event.level === "warning" ? "yellow" : "steel"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Compliance notes">
        <p style={{ margin: 0, color: "var(--steel-dim)", fontSize: 12, lineHeight: 1.6 }}>
          Audit entries are append-only. Gate automation events originate from GitHub webhooks;
          operator actions are attributed by session. Full export and retention policies will be
          configurable in a future release.
        </p>
      </Panel>
    </>
  );
}
