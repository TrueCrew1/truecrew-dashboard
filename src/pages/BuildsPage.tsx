import { Link } from "react-router-dom";
import { EmptyState, PageHeader, Panel, StageBadge, TableScroll } from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";

export function BuildsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const buildWorkflows = data.workflows.filter((w) => w.type === "build");
  const buildTasks = data.tasks.filter((t) => t.workflowType === "build");

  return (
    <>
      <PageHeader
        title="Builds"
        subtitle="Active and historical build workflows with per-build stage tracking"
      />

      <div className="page-stack">
        <Panel title="Build workflows">
          {buildWorkflows.length === 0 ? (
            <div className="panel-empty" data-empty="build-workflows" role="status">
              <EmptyState
                title="No build workflows"
                description="Build workflows appear once feature work is scoped, linked to a branch, and tracked through stage gates."
                action={
                  <Link to="/operations" className="empty-state-link">
                    View all workflows in Operations
                  </Link>
                }
              />
            </div>
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Build workflows table; scroll horizontally on smaller screens to view owner and summary columns."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Build</th>
                    <th>Stage</th>
                    <th>Owner</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {buildWorkflows.map((wf) => {
                    const rowId = wf.linkedTaskIds[0] ?? wf.id;
                    return (
                      <tr
                        key={wf.id}
                        className={`clickable-row${selectedEntityId === rowId ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(rowId)}
                      >
                        <td className="cell-truncate" title={wf.title}>
                          {wf.title}
                        </td>
                        <td>
                          <StageBadge stage={wf.stage} />
                        </td>
                        <td>{wf.owner}</td>
                        <td className="cell-clamp-2" title={wf.summary}>
                          {wf.summary}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Build tasks">
          {buildTasks.length === 0 ? (
            <div className="panel-empty" data-empty="build-tasks" role="status">
              <EmptyState
                title="No build tasks"
                description={
                  buildWorkflows.length > 0
                    ? "Workflows exist but no build tasks are linked yet. Open a branch and assign gates to populate this list."
                    : "Tasks linked to build workflows show up here once branches are opened and gates are assigned."
                }
                action={
                  buildWorkflows.length > 0 ? (
                    <Link to="/operations" className="empty-state-link">
                      Open Operations to link tasks
                    </Link>
                  ) : (
                    <Link to="/operations" className="empty-state-link">
                      View all workflows in Operations
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Build tasks table; scroll horizontally on smaller screens to view GitHub ref and gate status."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Stage</th>
                    <th>GitHub</th>
                    <th>Gates</th>
                  </tr>
                </thead>
                <tbody>
                  {buildTasks.map((task) => {
                    const openGates = task.gates.filter((g) => g.required && !g.passed);
                    return (
                      <tr
                        key={task.id}
                        className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(task.id)}
                      >
                        <td>
                          <TaskCell task={task} />
                        </td>
                        <td>
                          <StageBadge stage={task.stage} />
                        </td>
                        <td className="cell-mono cell-truncate" title={task.githubRef ?? undefined}>
                          {task.githubRef ?? "—"}
                        </td>
                        <td
                          className={openGates.length > 0 ? "cell-warning cell-truncate" : "cell-success"}
                          title={
                            openGates.length > 0
                              ? openGates.map((g) => g.label).join(" · ")
                              : undefined
                          }
                        >
                          {openGates.length > 0
                            ? openGates.map((g) => g.label).join(" · ")
                            : "Clear"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </>
  );
}
