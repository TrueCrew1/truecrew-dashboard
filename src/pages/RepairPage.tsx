import { Link } from "react-router-dom";
import {
  PageHeader,
  Panel,
  PanelEmpty,
  SeverityBadge,
  StageBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { isOpenTaskStage } from "../../lib/queries/dashboard-stats";

export function RepairPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const repairWorkflows = data.workflows.filter((w) => w.type === "repair");
  const activeRepairs = repairWorkflows.filter((w) => isOpenTaskStage(w.stage));
  const closedRepairs = repairWorkflows.filter((w) => !isOpenTaskStage(w.stage));

  return (
    <>
      <PageHeader
        title="Repair"
        subtitle="Incident remediation workflows linked to services and runbooks"
      />

      <div className="page-stack">
        <Panel title="Active repairs">
          {activeRepairs.length === 0 ? (
            <PanelEmpty
              emptyKey="repairs"
              title={
                repairWorkflows.length === 0
                  ? "No repair workflows"
                  : "No active repairs"
              }
              description={
                repairWorkflows.length === 0
                  ? "Remediation workflows appear here when an incident opens a repair pipeline."
                  : closedRepairs.length > 0
                    ? `${closedRepairs.length} closed repair workflow${closedRepairs.length === 1 ? "" : "s"} on record. Open Monitor if a new incident needs triage.`
                    : "All repair workflows are closed or archived. Open Monitor if a new incident needs triage."
              }
              variant={repairWorkflows.length === 0 ? "default" : "success"}
              action={
                <Link to="/monitor" className="empty-state-link">
                  {repairWorkflows.length === 0 ? "Open Monitor" : "Check Monitor for incidents"}
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Active repairs table; scroll horizontally on smaller screens to view linked incident details."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Repair</th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Owner
                    </th>
                    <th scope="col">Linked incident</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRepairs.map((wf) => {
                    const incident = data.incidents.find((i) => i.linkedRepairId === wf.id);
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
                        <td className="cell-truncate" title={incident?.title}>
                          {incident ? (
                            <>
                              <SeverityBadge severity={incident.severity} /> {incident.title}
                            </>
                          ) : (
                            <TableText value={null} fallback="No incident linked" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        {closedRepairs.length > 0 ? (
          <Panel title={`Closed repairs (${closedRepairs.length})`}>
            <TableScroll
              wide
              stickyFirst
              label="Closed repair workflows table."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Repair</th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Owner
                    </th>
                    <th scope="col">Linked incident</th>
                  </tr>
                </thead>
                <tbody>
                  {closedRepairs.map((wf) => {
                    const incident = data.incidents.find((i) => i.linkedRepairId === wf.id);
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
                        <td className="cell-truncate" title={incident?.title}>
                          {incident ? (
                            <>
                              <SeverityBadge severity={incident.severity} /> {incident.title}
                            </>
                          ) : (
                            <TableText value={null} fallback="No incident linked" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          </Panel>
        ) : null}

        <Panel title="Runbooks">
          {data.runbooks.length === 0 ? (
            <PanelEmpty
              emptyKey="runbooks"
              title="No runbooks indexed"
              description="Service runbooks sync from Obsidian and link here for incident triage and repair steps."
              action={
                <Link to="/knowledge" className="empty-state-link">
                  Open AI & Knowledge
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Runbooks table; scroll horizontally on smaller screens to view Obsidian paths."
              className="table-scroll--path-heavy"
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Runbook</th>
                    <th scope="col" className="col-service">
                      Service
                    </th>
                    <th scope="col">Obsidian path</th>
                  </tr>
                </thead>
                <tbody>
                  {data.runbooks.map((rb) => (
                    <tr key={rb.id}>
                      <td className="cell-truncate" title={rb.title}>
                        {rb.title}
                      </td>
                      <td>
                        <TableText value={rb.serviceName} fallback="Unknown service" />
                      </td>
                      <td>
                        <TableText value={rb.obsidianPath} mono truncate />
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
