import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PageHeader,
  Panel,
  PanelEmpty,
  PanelFilterEmpty,
  SeverityBadge,
  StatusBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
import { ApprovalAlertsPanel } from "@/components/chief/ApprovalAlertsPanel";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import {
  filterIncidentsByShiftParam,
  SHIFT_FILTER_LABELS,
} from "../../lib/queries/dashboard-stats";

const statusVariant = (status: string) => {
  if (status === "healthy") return "green" as const;
  if (status === "degraded") return "yellow" as const;
  if (status === "down") return "red" as const;
  return "steel" as const;
};

export function MonitorPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");

  const filteredIncidents = useMemo(
    () => filterIncidentsByShiftParam(data.incidents, filter),
    [data.incidents, filter],
  );

  const filterLabel = filter === "active-incidents" ? SHIFT_FILTER_LABELS["active-incidents"] : null;

  return (
    <>
      <PageHeader
        title="Monitor"
        accent="Services"
        subtitle="Service catalog health, open incidents, and deploy status"
      />

      {filterLabel ? (
        <div className="filter-banner">
          Filtered: {filterLabel} ·{" "}
          <Link to="/monitor" className="filter-banner-clear">
            Clear filter
          </Link>
        </div>
      ) : null}

      <div className="page-stack">
        <ApprovalAlertsPanel />

        <Panel title="Service catalog">
          {data.tools.length === 0 ? (
            <PanelEmpty
              emptyKey="services"
              title="No services registered"
              description="The service catalog is empty — add tools and APIs to track health here."
            />
          ) : (
            <TableScroll wide>
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Service</th>
                    <th scope="col" className="col-type">
                      Category
                    </th>
                    <th scope="col" className="col-stage">
                      Status
                    </th>
                    <th scope="col" className="col-ref">
                      Version
                    </th>
                    <th scope="col" className="col-env">
                      Environment
                    </th>
                    <th scope="col" className="col-order">
                      Incidents
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.tools.map((tool) => (
                    <tr key={tool.id}>
                      <td className="cell-truncate" title={tool.name}>
                        {tool.name}
                      </td>
                      <td>
                        <TableText value={tool.category} />
                      </td>
                      <td>
                        <StatusBadge status={tool.status} variant={statusVariant(tool.status)} />
                      </td>
                      <td>
                        <TableText value={tool.currentVersion} mono />
                      </td>
                      <td>
                        <TableText value={tool.environment} />
                      </td>
                      <td>
                        {tool.openIncidentIds.length > 0 ? (
                          tool.openIncidentIds.length
                        ) : (
                          <TableText value={null} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title={filterLabel ? `Incidents · ${filterLabel}` : "Open incidents"}>
          {data.incidents.length === 0 ? (
            <PanelEmpty
              emptyKey="incidents"
              title="No incidents recorded"
              description="Incident history will appear here when services report issues."
              variant="success"
            />
          ) : filteredIncidents.length === 0 && filterLabel ? (
            <PanelFilterEmpty
              emptyKey="incidents-filter"
              filterLabel={filterLabel}
              description="This filter shows incidents that are open, mitigating, or mitigated. None match right now — services may be fully resolved."
              clearAction={
                <Link to="/monitor" className="empty-state-link">
                  Clear filter and show all incidents
                </Link>
              }
            />
          ) : (
            <TableScroll>
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Incident</th>
                    <th scope="col" className="col-order">
                      Sev
                    </th>
                    <th scope="col" className="col-stage">
                      Status
                    </th>
                    <th scope="col" className="col-service">
                      Service
                    </th>
                    <th scope="col">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className={`clickable-row${selectedEntityId === inc.id ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(inc.id)}
                    >
                      <td className="cell-truncate" title={inc.title}>
                        {inc.title}
                      </td>
                      <td>
                        <SeverityBadge severity={inc.severity} />
                      </td>
                      <td>
                        <StatusBadge status={inc.status} variant="steel" />
                      </td>
                      <td>
                        <TableText value={inc.serviceName} fallback="Unknown service" />
                      </td>
                      <td className="cell-muted">
                        {new Date(inc.openedAt).toLocaleDateString()}
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
