/**
 * Today — multi-tenant work-order dashboard scaffold.
 *
 * Presentational layout only. `buildTodayScaffoldView` adapts page state to
 * section view models; this file renders those models without response parsing.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Panel,
  PanelEmpty,
  StatGrid,
  StatusBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
import type { TodayWorkOrdersState } from "@/hooks/useTodayWorkOrders";
import {
  buildTodayScaffoldView,
  type TodayApprovalNoteView,
  type TodayAttentionRowView,
  type TodayKpiCardView,
  type TodayOrgHeaderView,
  type TodayScaffoldSectionsView,
  type TodaySectionPhase,
  type TodayStatusSummaryRowView,
  type TodayWorkOrderTableRowView,
} from "./todayWorkOrdersView";

interface TodayWorkOrdersScaffoldProps {
  state: TodayWorkOrdersState;
  onRetry: () => void;
}

function PanelSkeleton({ width = "70%" }: { width?: string }) {
  return (
    <div className="health-card-skeleton" aria-busy="true">
      <div className="skeleton-line" />
      <div className="skeleton-line" style={{ width }} />
    </div>
  );
}

function TodaySectionShell<T>({
  section,
  skeleton,
  empty,
  children,
}: {
  section: TodaySectionPhase<T>;
  skeleton: ReactNode;
  empty: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (section.phase === "loading") return skeleton;
  if (section.phase === "empty") return empty;
  return children(section.data);
}

function TodayOrgContextHeader({
  section,
}: {
  section: TodaySectionPhase<TodayOrgHeaderView>;
}) {
  return (
    <section className="today-org-context" aria-label="Organization context">
      <TodaySectionShell
        section={section}
        skeleton={
          <>
            <div className="today-org-context-main">
              <span className="today-org-context-label">Organization</span>
              <span
                className="shift-stats-skeleton today-org-context-name"
                aria-hidden
                style={{ display: "inline-block", minWidth: "12rem", height: "1.25rem" }}
              />
            </div>
            <div className="today-org-context-meta">
              <span
                className="shift-stats-skeleton"
                aria-hidden
                style={{ display: "inline-block", width: "5rem", height: "1.25rem" }}
              />
            </div>
          </>
        }
        empty={<></>}
      >
        {(org) => (
          <>
            <div className="today-org-context-main">
              <span className="today-org-context-label">Organization</span>
              <span className="today-org-context-name">{org.orgName}</span>
            </div>
            <div className="today-org-context-meta">
              <StatusBadge status={org.membershipRole} variant="steel" />
            </div>
          </>
        )}
      </TodaySectionShell>
    </section>
  );
}

function TodayKpiCards({
  section,
}: {
  section: TodaySectionPhase<readonly TodayKpiCardView[]>;
}) {
  return (
    <TodaySectionShell
      section={section}
      skeleton={<PanelSkeleton width="100%" />}
      empty={<></>}
    >
      {(stats) => <StatGrid stats={stats.map((stat) => ({ ...stat }))} />}
    </TodaySectionShell>
  );
}

function WorkOrderStatusSummary({
  section,
}: {
  section: TodaySectionPhase<readonly TodayStatusSummaryRowView[]>;
}) {
  return (
    <Panel title="Work order priority / status">
      <p className="today-panel-help">
        Summary counts from the org-scoped page read model — not direct client RLS on{" "}
        <code>work_orders</code>.
      </p>
      <TodaySectionShell
        section={section}
        skeleton={<PanelSkeleton />}
        empty={
          <PanelEmpty
            emptyKey="today-status-summary"
            title="No work orders on the board"
            description="Priority and status rollups will appear when work orders exist for this org."
            variant="success"
          />
        }
      >
        {(rows) => (
          <TableScroll wide label="Work order priority and status summary table.">
            <table className="data-table data-table--comfortable">
              <thead>
                <tr>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.priorityLabel}</td>
                    <td>{row.statusLabel}</td>
                    <td className="cell-muted">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </TodaySectionShell>
    </Panel>
  );
}

function NeedsAttentionList({
  section,
}: {
  section: TodaySectionPhase<readonly TodayAttentionRowView[]>;
}) {
  return (
    <Panel title="Needs attention">
      <p className="today-panel-help">
        Escalations and blockers for the current org — sourced via backend, keyed off live
        membership role (not JWT claims alone).
      </p>
      <TodaySectionShell
        section={section}
        skeleton={<PanelSkeleton width="85%" />}
        empty={
          <PanelEmpty
            emptyKey="today-needs-attention"
            title="Nothing needs attention"
            description="No overdue, blocked, or unassigned work orders flagged for this shift."
            variant="success"
          />
        }
      >
        {(items) => (
          <ul className="today-attention-list">
            {items.map((item) => (
              <li key={item.id} className="today-attention-item">
                <span className="today-attention-label">{item.title}</span>
                {item.detail ? (
                  <span className="today-attention-detail">{item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </TodaySectionShell>
    </Panel>
  );
}

function TodaysWorkList({
  section,
}: {
  section: TodaySectionPhase<readonly TodayWorkOrderTableRowView[]>;
}) {
  return (
    <Panel title="Today's work — active & scheduled">
      <p className="today-panel-help">
        Active and scheduled work orders for the shift, filtered by current org membership.
      </p>
      <TodaySectionShell
        section={section}
        skeleton={<PanelSkeleton width="90%" />}
        empty={
          <PanelEmpty
            emptyKey="today-work-list"
            title="No work scheduled today"
            description="Active and scheduled work orders for this org will show here."
            variant="success"
          />
        }
      >
        {(rows) => (
          <TableScroll
            wide
            stickyFirst
            label="Today's active and scheduled work orders table."
          >
            <table className="data-table data-table--comfortable">
              <thead>
                <tr>
                  <th scope="col">Work order</th>
                  <th scope="col">Schedule</th>
                  <th scope="col">Status</th>
                  <th scope="col">Crew</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <TableText value={row.title} />
                    </td>
                    <td>
                      <TableText value={row.scheduleLabel} className="cell-muted" />
                    </td>
                    <td>
                      <StatusBadge
                        status={row.statusLabel}
                        variant={row.statusVariant}
                      />
                    </td>
                    <td>
                      <TableText value={row.crewLabel} className="cell-muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </TodaySectionShell>
    </Panel>
  );
}

function AuditorAwarenessNote({
  section,
}: {
  section: TodaySectionPhase<TodayApprovalNoteView>;
}) {
  return (
    <aside className="today-auditor-note" aria-label="Approval and auditor awareness">
      <span className="today-auditor-note-label">Approvals · auditor awareness</span>
      <TodaySectionShell
        section={section}
        skeleton={
          <p className="settings-health-loading" aria-busy="true">
            Loading approval context…
          </p>
        }
        empty={<></>}
      >
        {(approval) => (
          <p>
            {approval.summaryLine}{" "}
            {approval.auditorNote}{" "}
            Operator decisions surface in{" "}
            <Link to="/review" className="empty-state-link">
              Review
            </Link>{" "}
            and Chief; they do not gate work-order reads until explicitly wired.
          </p>
        )}
      </TodaySectionShell>
    </aside>
  );
}

function TodayWorkOrdersError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="today-work-orders-scaffold page-stack">
      <Panel title="Today's work orders">
        <PanelEmpty
          emptyKey="today-work-orders-error"
          title="Could not load work orders"
          description={error}
          action={
            <button type="button" className="empty-state-link" onClick={onRetry}>
              Retry
            </button>
          }
        />
      </Panel>
    </div>
  );
}

function TodayWorkOrdersContent({ sections }: { sections: TodayScaffoldSectionsView }) {
  return (
    <div className="today-work-orders-scaffold page-stack">
      <TodayOrgContextHeader section={sections.org} />
      <TodayKpiCards section={sections.kpis} />
      <div className="grid-2">
        <WorkOrderStatusSummary section={sections.statusSummary} />
        <NeedsAttentionList section={sections.needsAttention} />
      </div>
      <TodaysWorkList section={sections.workOrders} />
      <AuditorAwarenessNote section={sections.approval} />
    </div>
  );
}

/**
 * Primary Today layout for the multi-tenant work-order command center.
 * Receives typed page state from `useTodayWorkOrders` — no fetching here.
 */
export function TodayWorkOrdersScaffold({ state, onRetry }: TodayWorkOrdersScaffoldProps) {
  const view = buildTodayScaffoldView(state);

  if (view.kind === "error") {
    return <TodayWorkOrdersError error={view.error} onRetry={onRetry} />;
  }

  return <TodayWorkOrdersContent sections={view.sections} />;
}
