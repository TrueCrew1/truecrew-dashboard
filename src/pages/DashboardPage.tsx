import { PageHeader, Panel, StatGrid, StageBadge, TableScroll, EmptyState } from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { WorkflowStage } from "@/types";

export function DashboardPage() {
  const { data } = useData();
  const { selectedEntityId, setSelectedEntityId } = useSelection();

  const stageCounts = Object.values(WorkflowStage).reduce(
    (acc, stage) => {
      acc[stage] = data.tasks.filter((t) => t.stage === stage).length;
      return acc;
    },
    {} as Record<WorkflowStage, number>,
  );

  const activeTasks = data.tasks.filter((task) => task.stage !== WorkflowStage.Logged);

  return (
    <>
      <PageHeader
        title="Dashboard"
        accent="Overview"
        subtitle="Operational snapshot across workflows, services, and customers"
      />

      <StatGrid
        stats={[
          {
            label: "Active tasks",
            value: data.tasks.filter((t) => t.stage !== WorkflowStage.Logged).length,
            meta: `${stageCounts[WorkflowStage.InProgress]} in progress`,
          },
          {
            label: "Open incidents",
            value: data.incidents.filter((i) => i.status !== "resolved").length,
            meta: `${data.incidents.filter((i) => i.severity <= 2).length} Sev 1–2`,
          },
          {
            label: "Services",
            value: data.tools.length,
            meta: `${data.tools.filter((t) => t.status !== "healthy").length} degraded`,
          },
          {
            label: "Customers",
            value: data.customers.filter((c) => c.status === "active").length,
            meta: `${data.customers.filter((c) => c.status === "onboarding").length} onboarding`,
          },
        ]}
      />

      <div className="grid-2">
        <Panel title="Workflow pipeline">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stageCounts).map(([stage, count]) => (
                <tr key={stage}>
                  <td>
                    <StageBadge stage={stage as WorkflowStage} />
                  </td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Recent deploys">
          <table className="data-table">
            <thead>
              <tr>
                <th>Deploy</th>
                <th>Stage</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {data.deploys.map((d) => (
                <tr key={d.id}>
                  <td>{d.serviceName}</td>
                  <td>
                    <StageBadge stage={d.stage} />
                  </td>
                  <td className="mono">{d.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Active tasks">
        {activeTasks.length === 0 ? (
          <EmptyState
            title="No active tasks"
            description="Tasks in Logged stage are hidden from this view."
          />
        ) : (
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Stage</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.map((task) => (
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
                    <td className="cell-muted">{task.workflowType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}
