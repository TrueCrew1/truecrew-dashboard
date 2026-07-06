import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PageHeader,
  Panel,
  PanelEmpty,
  StageBadge,
  StatGrid,
  StatusBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { WorkflowStage } from "@/types";
import {
  buildChiefLiveContext,
  deriveApprovalCandidates,
} from "@/components/chief/chiefLiveContext";
import { formatChiefTimestamp } from "@/components/chief/chiefMock";
import { AGENT_WORK_ITEMS, type AgentWorkStatus } from "@/components/chief/commandCenterMock";

const DONE_STAGES = new Set([WorkflowStage.Done, WorkflowStage.Logged]);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const AGENT_STATUS_LABEL: Record<AgentWorkStatus, string> = {
  active: "Active",
  waiting: "Waiting",
  idle: "Idle",
};

const AGENT_STATUS_VARIANT: Record<AgentWorkStatus, "green" | "yellow" | "steel"> = {
  active: "green",
  waiting: "yellow",
  idle: "steel",
};

function countWithinLast(timestamps: string[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((iso) => new Date(iso).getTime() >= cutoff).length;
}

export function CommandCenterPage() {
  const { data } = useData();
  const { selectedEntityId, setSelectedEntityId } = useSelection();

  const liveContext = useMemo(() => buildChiefLiveContext(data), [data]);
  const derivedApprovals = useMemo(
    () => deriveApprovalCandidates(data, liveContext),
    [data, liveContext],
  );

  const recentCompletions = useMemo(
    () =>
      data.tasks
        .filter((task) => DONE_STAGES.has(task.stage))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [data.tasks],
  );

  const completionsLast7Days = useMemo(
    () => countWithinLast(recentCompletions.map((task) => task.updatedAt), SEVEN_DAYS_MS),
    [recentCompletions],
  );

  const blockers = useMemo(
    () =>
      [...liveContext.blockingTasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [liveContext.blockingTasks],
  );

  const activeAgentCount = AGENT_WORK_ITEMS.filter((item) => item.status === "active").length;

  return (
    <>
      <PageHeader
        title="Command Center"
        accent="Chief's home"
        subtitle="Where Chief, agent work, approvals, and operational signal come together"
      />

      <StatGrid
        stats={[
          {
            label: "Pending approvals",
            value: derivedApprovals.length,
            meta: "Derived from live data — see Chief for full queue",
          },
          {
            label: "Blocked work",
            value: liveContext.blockingTasks.length,
            meta: "Open required gates",
          },
          {
            label: "Active incidents",
            value: liveContext.activeIncidents.length,
            meta: "Sev 1–4, unresolved",
          },
          {
            label: "Completions (7d)",
            value: completionsLast7Days,
            meta: `${activeAgentCount} agent${activeAgentCount === 1 ? "" : "s"} active now`,
          },
        ]}
      />

      <div className="page-stack">
        <Panel title="Chief">
          <div className="panel-copy">
            <p>
              Chief coordinates specialist agents, tracks gates and risk across the board, and is
              the only path an approval reaches you through.
            </p>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Pending approvals</div>
                <div className="stat-value">{derivedApprovals.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">At risk</div>
                <div className="stat-value">{liveContext.focusItems.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Missing context</div>
                <div className="stat-value">
                  {liveContext.tasksMissingCustomer.length +
                    liveContext.tasksMissingWorkflow.length}
                </div>
              </div>
            </div>
            <p>
              Run commands or decide approvals in the Chief panel on the right — this page is a
              summary view, not a second decision surface.
            </p>
          </div>
        </Panel>

        <Panel
          title="Agent work board"
          action={<StatusBadge status="Illustrative" variant="steel" />}
        >
          <TableScroll label="Agent work board table.">
            <table className="data-table data-table--comfortable">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Current task</th>
                  <th scope="col" className="col-order">
                    Status
                  </th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {AGENT_WORK_ITEMS.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <TableText value={item.agent} />
                    </td>
                    <td>
                      <div className="task-cell-title" title={item.detail}>
                        {item.task}
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        status={AGENT_STATUS_LABEL[item.status]}
                        variant={AGENT_STATUS_VARIANT[item.status]}
                      />
                    </td>
                    <td>
                      <TableText value={formatChiefTimestamp(item.updatedAt)} className="cell-muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <p className="panel-note">
            No live agent job queue exists yet — this board is a placeholder shape for when
            agents report real status.
          </p>
        </Panel>

        <Panel title="Approvals snapshot">
          {derivedApprovals.length === 0 ? (
            <PanelEmpty
              emptyKey="cc-approvals"
              title="No pending approvals"
              description="Nothing derived from current dashboard state needs a decision right now."
              variant="success"
            />
          ) : (
            <div className="panel-copy">
              <ul className="chief-board-list">
                {derivedApprovals.slice(0, 4).map((proposal) => (
                  <li key={proposal.id}>
                    <Link
                      to={proposal.routeTo ?? "/"}
                      className="chief-board-card chief-board-card--warn"
                    >
                      <div className="chief-board-card-header">
                        <span className="chief-board-card-title">{proposal.title}</span>
                      </div>
                      <p className="chief-board-card-detail">{proposal.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              <p>
                {derivedApprovals.length} derived from current dashboard signals. Decide these,
                plus any additional cards, in the Chief panel's Approvals tab.
              </p>
            </div>
          )}
        </Panel>

        <div className="grid-2">
          <Panel title="Recent completions">
            {recentCompletions.length === 0 ? (
              <PanelEmpty
                emptyKey="cc-completions"
                title="No completions yet"
                description="Tasks marked Done or Logged will appear here."
              />
            ) : (
              <TableScroll label="Recent completions table.">
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col" className="col-stage">
                        Stage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCompletions.map((task) => (
                      <tr
                        key={task.id}
                        className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(task.id)}
                      >
                        <td>
                          <TableText value={task.title} truncate />
                        </td>
                        <td>
                          <StageBadge stage={task.stage} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>

          <Panel title="Blockers">
            {blockers.length === 0 ? (
              <PanelEmpty
                emptyKey="cc-blockers"
                title="Nothing blocked"
                description="No open tasks have unmet required gates right now."
                variant="success"
              />
            ) : (
              <TableScroll label="Blockers table.">
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col" className="col-stage">
                        Stage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockers.map((task) => (
                      <tr
                        key={task.id}
                        className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(task.id)}
                      >
                        <td>
                          <TableText value={task.title} truncate />
                        </td>
                        <td>
                          <StageBadge stage={task.stage} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
