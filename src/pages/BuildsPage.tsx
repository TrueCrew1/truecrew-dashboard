import { Link } from "react-router-dom";
import { EmptyState, PageHeader, Panel, StageBadge } from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";

const BUILD_TABLE = "table-scroll table-scroll--wide table-scroll--sticky-first";

export function BuildsPage() {
  const { setSelectedEntityId } = useSelection();
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
          <div className="panel-empty" data-empty="workflows" role="status">
            <EmptyState
              title="No build workflows"
              description="Build workflows appear here once feature work is scoped and tracked through stage gates."
              action={
                <Link to="/operations" className="empty-state-link">
                  Open Operations
                </Link>
              }
            />
          </div>
        ) : (
          <div className={BUILD_TABLE}>
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
                {buildWorkflows.map((wf) => (
                  <tr key={wf.id}>
                    <td>{wf.title}</td>
                    <td>
                      <StageBadge stage={wf.stage} />
                    </td>
                    <td>{wf.owner}</td>
                    <td style={{ color: "var(--steel-dim)" }}>{wf.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Build tasks">
        {buildTasks.length === 0 ? (
          <div className="panel-empty" data-empty="tasks" role="status">
            <EmptyState
              title="No build tasks"
              description="Tasks linked to build workflows show up here once branches are opened and gates are assigned."
              action={
                <Link to="/operations" className="empty-state-link">
                  Open Operations
                </Link>
              }
            />
          </div>
        ) : (
          <div className={BUILD_TABLE}>
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
                {buildTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="clickable-row"
                    onClick={() => setSelectedEntityId(task.id)}
                  >
                    <td>
                      <TaskCell task={task} />
                    </td>
                    <td>
                      <StageBadge stage={task.stage} />
                    </td>
                    <td className="mono">{task.githubRef ?? "—"}</td>
                    <td>
                      {task.gates.filter((g) => g.required && !g.passed).length} open
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      </div>
    </>
  );
}
