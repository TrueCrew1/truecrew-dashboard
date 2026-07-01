import { Link } from "react-router-dom";
import {
  GatesCell,
  PageHeader,
  Panel,
  PanelEmpty,
  StageBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
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
            <PanelEmpty
              emptyKey="build-workflows"
              title="No build workflows"
              description="Build workflows appear once feature work is scoped, linked to a branch, and tracked through stage gates."
              action={
                <Link to="/operations" className="empty-state-link">
                  View all workflows in Operations
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Build workflows table; scroll horizontally on smaller screens to view owner and summary columns."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Build</th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Owner
                    </th>
                    <th scope="col">Summary</th>
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
                        <td>
                          <TableText value={wf.owner} fallback="Unassigned" />
                        </td>
                        <td>
                          <TableText value={wf.summary} clamp2 />
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
            <PanelEmpty
              emptyKey="build-tasks"
              title="No build tasks"
              description={
                buildWorkflows.length > 0
                  ? "Workflows exist but no build tasks are linked yet. Open a branch and assign gates to populate this list."
                  : "Tasks linked to build workflows show up here once branches are opened and gates are assigned."
              }
              action={
                <Link to="/operations" className="empty-state-link">
                  {buildWorkflows.length > 0
                    ? "Open Operations to link tasks"
                    : "View all workflows in Operations"}
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Build tasks table; scroll horizontally on smaller screens to view GitHub ref and gate status."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-ref">
                      GitHub ref
                    </th>
                    <th scope="col" className="col-gates">
                      Open gates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {buildTasks.map((task) => (
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
                      <td>
                        <TableText value={task.githubRef} mono truncate />
                      </td>
                      <td>
                        <GatesCell gates={task.gates} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </>
  );
}
