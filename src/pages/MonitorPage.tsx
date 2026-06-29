import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader, Panel, SeverityBadge, StatusBadge } from "@/components/ui";
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

      <Panel title="Service catalog">
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
      </Panel>

      <Panel title={filterLabel ? `Incidents · ${filterLabel}` : "Open incidents"}>
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
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">No incidents match this filter.</div>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((inc) => (
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
                  <td style={{ color: "var(--steel-dim)" }}>
                    {new Date(inc.openedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
