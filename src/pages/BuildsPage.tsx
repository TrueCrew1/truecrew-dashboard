import { mockData } from "@/data/mockData";
import { PageHeader, Panel, StageBadge } from "@/components/ui";
import { useSelection } from "@/context/SelectionContext";

export function BuildsPage() {
  const { setSelectedEntityId } = useSelection();
  const buildWorkflows = mockData.workflows.filter((w) => w.type === "build");
  const buildTasks = mockData.tasks.filter((t) => t.workflowType === "build");

  return (
    <>
      <PageHeader
        title="Builds"
        subtitle="Active and historical build workflows with per-build stage tracking"
      />

      <Panel title="Build workflows">
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
      </Panel>

      <Panel title="Build tasks">
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
                <td>{task.title}</td>
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
      </Panel>
    </>
  );
}
