"use client";

import { PageHeader, Panel, StageBadge, StatGrid, StatusBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { WorkflowStage } from "@/types";

export default function WorkspacePage() {
  const { setSelectedEntityId } = useSelection();
  const { data } = useData();

  const assigned = data.tasks.filter(
    (t) => t.stage !== WorkflowStage.Done && t.stage !== WorkflowStage.Logged,
  );
  const inProgress = assigned.filter((t) => t.stage === WorkflowStage.InProgress).length;
  const waiting = assigned.filter((t) => t.stage === WorkflowStage.Waiting).length;

  return (
    <>
      <PageHeader
        title="Assigned Work"
        accent="Workspace"
        subtitle="Tasks and workflows currently owned by the crew — triage, execute, and advance"
      />

      <StatGrid
        stats={[
          { label: "Assigned", value: assigned.length, meta: "Active pipeline items" },
          { label: "In progress", value: inProgress, meta: "Currently executing" },
          { label: "Waiting", value: waiting, meta: "Blocked or pending input" },
          {
            label: "Review",
            value: assigned.filter((t) => t.stage === WorkflowStage.Review).length,
            meta: "Awaiting sign-off",
          },
        ]}
      />

      <Panel title="Assignment board">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Type</th>
              <th>Stage</th>
              <th>Priority</th>
              <th>Blocker</th>
            </tr>
          </thead>
          <tbody>
            {assigned.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">No assigned work — queue is clear</div>
                </td>
              </tr>
            ) : (
              assigned.map((task) => (
                <tr
                  key={task.id}
                  className="clickable-row"
                  onClick={() => setSelectedEntityId(task.id)}
                >
                  <td>{task.title}</td>
                  <td style={{ color: "var(--steel-dim)" }}>{task.workflowType}</td>
                  <td>
                    <StageBadge stage={task.stage} />
                  </td>
                  <td>
                    <StatusBadge
                      status={task.priority}
                      variant={
                        task.priority === "critical"
                          ? "red"
                          : task.priority === "high"
                            ? "orange"
                            : "steel"
                      }
                    />
                  </td>
                  <td style={{ color: "var(--steel-dim)" }}>{task.blocker ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      <div className="grid-2">
        <Panel title="Workflows in flight">
          <table className="data-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {data.workflows.map((wf) => (
                <tr
                  key={wf.id}
                  className="clickable-row"
                  onClick={() => setSelectedEntityId(wf.id)}
                >
                  <td>{wf.title}</td>
                  <td>
                    <StageBadge stage={wf.stage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Deploy queue">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Version</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {data.deploys.map((deploy) => (
                <tr key={deploy.id}>
                  <td>{deploy.serviceName}</td>
                  <td className="mono">{deploy.version}</td>
                  <td>
                    <StageBadge stage={deploy.stage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
