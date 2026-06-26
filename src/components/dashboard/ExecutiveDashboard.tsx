import { Link } from "react-router-dom";
import {
  PageHeader,
  SeverityBadge,
  StageBadge,
  StatusBadge,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { buildExecutiveDashboard } from "@/lib/dashboard";
import type {
  ActionQueueItem,
  CapacityStatus,
  KpiStatus,
  KpiTile,
  PostureLevel,
  TrendCard,
} from "@/lib/dashboard/types";
import { useMemo } from "react";

function statusClass(level: PostureLevel | KpiStatus | CapacityStatus): string {
  if (level === "red") return "exec-status-red";
  if (level === "amber" || level === "loaded") return "exec-status-amber";
  if (level === "blocked") return "exec-status-red";
  return "exec-status-green";
}

function postureLabel(level: PostureLevel): string {
  return level.toUpperCase();
}

function capacityBadge(status: CapacityStatus): { label: string; variant: "green" | "yellow" | "red" } {
  if (status === "available") return { label: "Available", variant: "green" };
  if (status === "loaded") return { label: "Loaded", variant: "yellow" };
  return { label: "Blocked", variant: "red" };
}

function serviceVariant(status: string): "green" | "yellow" | "red" | "steel" {
  if (status === "healthy") return "green";
  if (status === "degraded") return "yellow";
  if (status === "down") return "red";
  return "steel";
}

function trendArrow(direction: TrendCard["direction"]): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

function KpiTileCard({
  tile,
  onSelect,
}: {
  tile: KpiTile;
  onSelect: (entityId?: string) => void;
}) {
  return (
    <button type="button" className="exec-kpi-tile" onClick={() => onSelect(tile.entityId)}>
      <div className="exec-kpi-top">
        <span className="exec-kpi-label">{tile.label}</span>
        <span className={`exec-kpi-dot ${statusClass(tile.status)}`} />
      </div>
      <div className="exec-kpi-value">{tile.value}</div>
      <div className="exec-kpi-context">{tile.context}</div>
    </button>
  );
}

function ActionQueueRow({
  item,
  onSelect,
}: {
  item: ActionQueueItem;
  onSelect: (entityId: string) => void;
}) {
  return (
    <button type="button" className="exec-queue-row" onClick={() => onSelect(item.entityId)}>
      <div className="exec-queue-main">
        <span className="badge badge-orange">{item.pill}</span>
        <span className="exec-queue-title">{item.title}</span>
        <span className="exec-queue-owner">{item.owner}</span>
        <span className="exec-queue-age">{item.age}</span>
      </div>
      <div className="exec-queue-reason">{item.reason}</div>
    </button>
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
        subtitle="Founder command center — revenue, ops, and risk in one view"
      />

      {source !== "supabase" ? (
        <div className="exec-mock-banner">Mock data · Connect Supabase for live posture</div>
      ) : null}

      <section className="exec-top-strip">
        <button
          type="button"
          className={`exec-posture ${statusClass(model.posture.level)}`}
          onClick={() => selectEntity(model.posture.entityId)}
        >
          {postureLabel(model.posture.level)}
        </button>
        <div className="exec-top-copy">
          <div className="exec-top-reason">{model.posture.reason}</div>
          <div className="exec-top-meta">
            Last updated · {loading ? "refreshing…" : "just now"} ·{" "}
            <span className={`badge ${source === "supabase" ? "badge-ice" : "badge-steel"}`}>
              {sourceLabel}
            </span>
          </div>
        </div>
        <button type="button" className="topbar-btn exec-refresh" onClick={() => void refresh()}>
          ↻ Refresh
        </button>
      </section>

      <section className="exec-kpi-strip">
        {model.kpis.map((tile) => (
          <KpiTileCard key={tile.id} tile={tile} onSelect={selectEntity} />
        ))}
      </section>

      <section className="exec-main-grid">
        <section className="panel exec-panel exec-panel-primary">
          <div className="panel-header">
            <span className="panel-title">Action queue</span>
            <Link to="/" className="exec-panel-link">
              View all in Today →
            </Link>
          </div>
          <div className="panel-body exec-panel-stack">
            {model.actionQueue.length === 0 ? (
              <div className="exec-empty">
                No founder actions queued.{" "}
                <Link to="/" className="exec-panel-link">
                  See operator work in Today →
                </Link>
              </div>
            ) : (
              model.actionQueue.map((item) => (
                <ActionQueueRow key={item.id} item={item} onSelect={selectEntity} />
              ))
            )}
          </div>
        </section>

        <section className="panel exec-panel">
          <div className="panel-header">
            <span className="panel-title">Ops posture</span>
          </div>
          <div className="panel-body exec-panel-stack">
            <div className="exec-subsection">
              <div className="exec-subsection-title">Services (production)</div>
              {model.ops.services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className="exec-row"
                  onClick={() => selectEntity(service.id)}
                >
                  <span>{service.name}</span>
                  <span className="exec-row-meta">
                    <StatusBadge status={service.status} variant={serviceVariant(service.status)} />
                    {service.incidentCount > 0 ? (
                      <span className="badge badge-red">{service.incidentCount} open</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>

            <div className="exec-subsection">
              <div className="exec-subsection-title">Active incidents</div>
              {model.ops.incidents.length === 0 ? (
                <div className="exec-empty">No open incidents.</div>
              ) : (
                model.ops.incidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    className="exec-row"
                    onClick={() => selectEntity(incident.id)}
                  >
                    <span>{incident.title}</span>
                    <span className="exec-row-meta">
                      <SeverityBadge severity={incident.severity} />
                      <span className="exec-row-subtle">{incident.status}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="exec-subsection">
              <div className="exec-subsection-title">Deploy pipeline</div>
              {model.ops.deploys.length === 0 ? (
                <div className="exec-empty">No production deploys in pipeline.</div>
              ) : (
                model.ops.deploys.map((deploy) => (
                  <button
                    key={deploy.id}
                    type="button"
                    className="exec-row exec-row-stack"
                    onClick={() => selectEntity(deploy.id)}
                  >
                    <span className="exec-row-title">{deploy.title}</span>
                    <span className="exec-row-meta">
                      <StageBadge stage={deploy.stage} />
                    </span>
                    <span className="exec-row-subtle">{deploy.blocker}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="panel exec-panel">
          <div className="panel-header">
            <span className="panel-title">Revenue & customers</span>
          </div>
          <div className="panel-body exec-panel-stack">
            <div className="exec-subsection">
              <div className="exec-subsection-title">Segments</div>
              {model.revenue.segments.map((segment) => (
                <div key={segment.label} className="exec-row exec-row-static">
                  <span>{segment.label}</span>
                  <span className="exec-row-meta">
                    <span className="exec-segment-count">{segment.count}</span>
                    {segment.note ? (
                      <span className="exec-row-subtle">{segment.note}</span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>

            {model.revenue.onboarding.length > 0 ? (
              <div className="exec-subsection">
                <div className="exec-subsection-title">Onboarding</div>
                {model.revenue.onboarding.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="exec-row"
                    onClick={() => selectEntity(row.id)}
                  >
                    <span>{row.name}</span>
                    <span className="exec-row-subtle">
                      checklist {row.checklistDone}/{row.checklistTotal}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="exec-subsection">
              <div className="exec-subsection-title">At-risk</div>
              {model.revenue.atRisk.length === 0 ? (
                <div className="exec-empty">No at-risk accounts.</div>
              ) : (
                model.revenue.atRisk.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="exec-row"
                    onClick={() => selectEntity(row.id)}
                  >
                    <span>{row.name}</span>
                    <span className="exec-row-subtle">
                      {row.reason}
                    </span>
                  </button>
                ))
              )}
            </div>

            {model.revenue.enterpriseBlocker ? (
              <div className="exec-enterprise-blocker">{model.revenue.enterpriseBlocker}</div>
            ) : null}

            <div className="exec-subsection">
              <div className="exec-subsection-title">Capacity</div>
              {model.capacity.map((row) => {
                const badge = capacityBadge(row.status);
                return (
                  <div key={row.persona} className="exec-row exec-row-static">
                    <span>{row.label}</span>
                    <StatusBadge status={badge.label} variant={badge.variant} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </section>

      <section className="exec-trend-grid">
        {model.trends.map((card) => (
          <button
            key={card.id}
            type="button"
            className="exec-trend-card"
            onClick={() => selectEntity(model.drillEntityId)}
          >
            <div className="exec-trend-label">{card.label}</div>
            <div className="exec-trend-value">
              {card.now}
              <span className={`exec-trend-delta exec-trend-${card.direction}`}>
                {card.baselineBuilding ? "Baseline building" : `${trendArrow(card.direction)} ${card.delta}`}
              </span>
            </div>
          </button>
        ))}
      </section>
    </>
  );
}
