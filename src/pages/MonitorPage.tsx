import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  EmptyState,
  PageHeader,
  Panel,
  SeverityBadge,
  StatusBadge,
  TableScroll,
} from "@/components/ui";
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
        <Panel title="Service catalog">
          {data.tools.length === 0 ? (
            <EmptyState
              title="No services registered"
              description="The service catalog is empty — add tools and APIs to track health here."
            />
          ) : (
            <TableScroll wide>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Environment</th>
                    <th>Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tools.map((tool) => (
                    <tr key={tool.id}>
                      <td>{tool.name}</td>
                      <td>{tool.category}</td>
                      <td>
                        <StatusBadge status={tool.status} variant={statusVariant(tool.status)} />
                      </td>
                      <td className="mono">{tool.currentVersion ?? "—"}</td>
                      <td>{tool.environment}</td>
                      <td>{tool.openIncidentIds.length || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title={filterLabel ? `Incidents · ${filterLabel}` : "Open incidents"}>
          {data.incidents.length === 0 ? (
            <EmptyState
              title="No incidents recorded"
              description="Incident history will appear here when services report issues."
              variant="success"
            />
          ) : filteredIncidents.length === 0 && filterLabel ? (
            <EmptyState
              title={`No incidents match “${filterLabel}”`}
              description="This filter shows incidents that are open, mitigating, or mitigated. None match right now — services may be fully resolved."
              variant="filter"
              action={
                <Link to="/monitor" className="empty-state-link">
                  Clear filter and show all incidents
                </Link>
              }
            />
          ) : (
            <TableScroll>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Sev</th>
                    <th>Status</th>
                    <th>Service</th>
                    <th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className={`clickable-row${selectedEntityId === inc.id ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(inc.id)}
                    >
                      <td>{inc.title}</td>
                      <td>
                        <SeverityBadge severity={inc.severity} />
                      </td>
                      <td>{inc.status}</td>
                      <td>{inc.serviceName}</td>
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
