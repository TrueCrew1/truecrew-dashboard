import { Link } from "react-router-dom";
import { PageHeader, StatusBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { buildExecutiveDashboard } from "@/lib/dashboard";
import type { DispatchRow, KpiTile, TrendCard } from "@/lib/dashboard/types";
import { useMemo } from "react";

function statusClass(status: string): string {
  if (status === "red") return "exec-status-red";
  if (status === "amber") return "exec-status-amber";
  return "exec-status-green";
}

function dispatchVariant(
  status: DispatchRow["status"],
): "green" | "yellow" | "red" | "steel" | "orange" {
  if (status === "gap" || status === "unassigned") return "orange";
  if (status === "delayed") return "red";
  return "steel";
}

function trendArrow(direction: TrendCard["direction"]): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

function KpiCard({
  tile,
  onSelect,
}: {
  tile: KpiTile;
  onSelect: (entityId?: string) => void;
}) {
  return (
    <Link
      to={tile.drillTo}
      className="exec-kpi-tile exec-drill-link"
      onClick={() => onSelect(tile.entityId)}
    >
      <div className="exec-kpi-top">
        <span className="exec-kpi-label">{tile.label}</span>
        <span className={`exec-kpi-dot ${statusClass(tile.status)}`} />
      </div>
      <div className="exec-kpi-value">{tile.value}</div>
      <div className="exec-kpi-context">{tile.context}</div>
    </Link>
  );
}

export function ExecutiveDashboard() {
  const { data, source, loading, refresh } = useData();
  const { setSelectedEntityId } = useSelection();
  const model = useMemo(() => buildExecutiveDashboard(data), [data]);

  const sourceLabel =
    source === "supabase" ? "Live" : source === "mock-fallback" ? "Fallback" : "Mock";

  const selectEntity = (entityId?: string) => {
    if (entityId) setSelectedEntityId(entityId);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        accent="Overview"
        subtitle="Executive command center — dispatch, revenue, and risk at a glance"
      />

      {source !== "supabase" ? (
        <div className="exec-mock-banner">
          Seeded field-ops data · Connect Supabase for live jobs, invoices, and inventory
        </div>
      ) : null}

      <section className="exec-status-strip">
        <div className="exec-status-meta">
          <span className="exec-status-title">Today&apos;s status</span>
          <span className="exec-status-sub">
            {loading ? "Refreshing…" : "Updated just now"} ·{" "}
            <span className={`badge ${source === "supabase" ? "badge-ice" : "badge-steel"}`}>
              {sourceLabel}
            </span>
          </span>
        </div>
        <button type="button" className="topbar-btn exec-refresh" onClick={() => void refresh()}>
          ↻ Refresh
        </button>
      </section>

      <section className="exec-kpi-strip exec-kpi-strip-6">
        {model.kpis.map((tile) => (
          <KpiCard key={tile.id} tile={tile} onSelect={selectEntity} />
        ))}
      </section>

      <section className="exec-main-grid exec-main-grid-4">
        <section className="panel exec-panel">
          <div className="panel-header">
            <span className="panel-title">Dispatch summary</span>
            <Link to="/operations?filter=dispatch" className="exec-panel-link">
              Open dispatch →
            </Link>
          </div>
          <div className="panel-body exec-panel-stack">
            <div className="exec-summary-row">
              <Link to="/operations?filter=dispatch" className="exec-mini-stat exec-drill-link">
                <span className="exec-mini-value">{model.dispatch.scheduledToday}</span>
                <span className="exec-mini-label">Scheduled today</span>
              </Link>
              <Link to="/operations?filter=crew-gaps" className="exec-mini-stat exec-drill-link">
                <span className="exec-mini-value">{model.dispatch.crewGaps}</span>
                <span className="exec-mini-label">Crew gaps</span>
              </Link>
              <Link to="/repair?filter=delayed" className="exec-mini-stat exec-drill-link">
                <span className="exec-mini-value">{model.dispatch.delayedJobs}</span>
                <span className="exec-mini-label">Delayed jobs</span>
              </Link>
            </div>
            {model.dispatch.rows.map((row) => (
              <Link
                key={row.id}
                to={row.drillTo}
                className="exec-row exec-drill-link"
                onClick={() => selectEntity(row.entityId)}
              >
                <span className="exec-row-time">{row.time}</span>
                <span className="exec-row-copy">
                  <span className="exec-row-title">{row.label}</span>
                  <span className="exec-row-subtle">{row.detail}</span>
                </span>
                <StatusBadge status={row.status} variant={dispatchVariant(row.status)} />
              </Link>
            ))}
          </div>
        </section>

        <section className="panel exec-panel exec-panel-primary">
          <div className="panel-header">
            <span className="panel-title">Action queue</span>
            <Link to="/review" className="exec-panel-link">
              Review workspace →
            </Link>
          </div>
          <div className="panel-body exec-panel-stack">
            {model.actionQueue.length === 0 ? (
              <div className="exec-empty">No actions waiting.</div>
            ) : (
              model.actionQueue.map((item) => (
                <Link
                  key={item.id}
                  to={item.drillTo}
                  className="exec-queue-row exec-drill-link"
                  onClick={() => selectEntity(item.entityId)}
                >
                  <div className="exec-queue-main">
                    <span className="badge badge-orange">{item.pill}</span>
                    <span className="exec-queue-title">{item.title}</span>
                    <span className="exec-queue-age">{item.age}</span>
                  </div>
                  <div className="exec-queue-reason">{item.reason}</div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="panel exec-panel">
          <div className="panel-header">
            <span className="panel-title">Revenue lane</span>
            <Link to="/customers?filter=revenue" className="exec-panel-link">
              Customers →
            </Link>
          </div>
          <div className="panel-body exec-panel-stack">
            {model.revenue.rows.map((row) => (
              <Link key={row.id} to={row.drillTo} className="exec-row exec-drill-link">
                <span>{row.label}</span>
                <span className="exec-row-meta">
                  <span className="exec-segment-count">{row.count}</span>
                  <span className="exec-row-subtle">{row.amount}</span>
                </span>
              </Link>
            ))}
            <div className="exec-lane-footer">
              Unpaid balance · <strong>{model.revenue.unpaidBalance}</strong>
            </div>
          </div>
        </section>

        <section className="panel exec-panel">
          <div className="panel-header">
            <span className="panel-title">Risk lane</span>
            <Link to="/repair?filter=risk" className="exec-panel-link">
              Repair workspace →
            </Link>
          </div>
          <div className="panel-body exec-panel-stack">
            <div className="exec-summary-row">
              <Link to="/repair?filter=blocked" className="exec-mini-stat exec-drill-link">
                <span className="exec-mini-value">{model.risk.blockedCount}</span>
                <span className="exec-mini-label">Blocked</span>
              </Link>
              <Link to="/repair?filter=repeat" className="exec-mini-stat exec-drill-link">
                <span className="exec-mini-value">{model.risk.repeatCount}</span>
                <span className="exec-mini-label">Repeat issues</span>
              </Link>
              <Link to="/operations?filter=aging" className="exec-mini-stat exec-drill-link">
                <span className="exec-mini-value">{model.risk.agingCount}</span>
                <span className="exec-mini-label">Aging tickets</span>
              </Link>
            </div>
            {model.risk.rows.length === 0 ? (
              <div className="exec-empty">No active risk items.</div>
            ) : (
              model.risk.rows.map((row) => (
                <Link
                  key={row.id}
                  to={row.drillTo}
                  className="exec-row exec-drill-link"
                  onClick={() => selectEntity(row.entityId)}
                >
                  <span className="exec-row-copy">
                    <span className="exec-row-title">{row.title}</span>
                    <span className="exec-row-subtle">{row.detail}</span>
                  </span>
                  <span className="badge badge-red">{row.pill}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="exec-trend-grid exec-trend-grid-3">
        {model.trends.map((card) => (
          <Link key={card.id} to={card.drillTo} className="exec-trend-card exec-drill-link">
            <div className="exec-trend-label">{card.label}</div>
            <div className="exec-trend-value">
              {card.now}
              <span className={`exec-trend-delta exec-trend-${card.direction}`}>
                {trendArrow(card.direction)} {card.delta}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
