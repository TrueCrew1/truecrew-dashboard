"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PageHeader,
  PageShell,
  StatGrid,
  StatusBadge,
} from "@/components/ui";
import {
  deriveWorkOrderFilterOptions,
  filterWorkOrders,
  formatOperationalDate,
  SLA_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANT,
  PRIORITY_VARIANT,
  workOrderStats,
  type WorkOrderFilters,
  type WorkOrderRow,
} from "@/lib/operational";
import { OperationalFilters } from "./OperationalFilters";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...Object.entries(WORK_ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const SLA_OPTIONS = [
  { value: "all", label: "All SLA tiers" },
  ...Object.entries(SLA_LABELS).map(([value, label]) => ({ value, label })),
];

export function WorkOrdersListView({ initialOrders }: { initialOrders: WorkOrderRow[] }) {
  const [filters, setFilters] = useState<WorkOrderFilters>({
    search: "",
    status: "all",
    site: "all",
    crew: "all",
    sla: "all",
  });

  const options = useMemo(() => deriveWorkOrderFilterOptions(initialOrders), [initialOrders]);
  const filtered = useMemo(
    () => filterWorkOrders(initialOrders, filters),
    [initialOrders, filters],
  );
  const stats = useMemo(() => workOrderStats(initialOrders), [initialOrders]);

  const siteOptions = [
    { value: "all", label: "All sites" },
    ...options.sites.map((s) => ({ value: s, label: s })),
  ];
  const crewOptions = [
    { value: "all", label: "All crews" },
    ...options.crews.map((c) => ({ value: c, label: c })),
  ];

  return (
    <PageShell>
      <PageHeader
        kicker="Operations"
        title="Work Orders"
        description="Active maintenance and service orders by status, site, crew, and SLA tier."
      />

      <StatGrid
        stats={[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active, meta: "Open pipeline" },
          { label: "In progress", value: stats.inProgress },
          { label: "Blocked", value: stats.blocked, meta: stats.overdue ? `${stats.overdue} overdue` : undefined },
        ]}
      />

      <OperationalFilters
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        searchPlaceholder="Search work orders…"
        selects={[
          {
            id: "status",
            label: "Status",
            value: filters.status,
            onChange: (status) => setFilters((f) => ({ ...f, status })),
            options: STATUS_OPTIONS,
          },
          {
            id: "site",
            label: "Site",
            value: filters.site,
            onChange: (site) => setFilters((f) => ({ ...f, site })),
            options: siteOptions,
          },
          {
            id: "crew",
            label: "Crew",
            value: filters.crew,
            onChange: (crew) => setFilters((f) => ({ ...f, crew })),
            options: crewOptions,
          },
          {
            id: "sla",
            label: "SLA",
            value: filters.sla,
            onChange: (sla) => setFilters((f) => ({ ...f, sla })),
            options: SLA_OPTIONS,
          },
        ]}
      />

      <section className="panel">
        {filtered.length === 0 ? (
          <div className="page-state">
            <h2 className="page-state-title">No work orders match</h2>
            <p className="page-state-copy">Adjust filters or run db:push to load seed data.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Work order</th>
                <th>Status</th>
                <th>Site</th>
                <th>Crew</th>
                <th>SLA</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="clickable-row">
                  <td>
                    <Link href={`/work-orders/${order.id}`} className="ops-table-link">
                      <span className="ops-table-title">{order.title}</span>
                      <span className="ops-table-meta">
                        {order.assignee ?? "Unassigned"}
                        {order.priority ? ` · ${order.priority}` : ""}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <StatusBadge
                      status={WORK_ORDER_STATUS_LABELS[order.status] ?? order.status}
                      variant={WORK_ORDER_STATUS_VARIANT[order.status] ?? "steel"}
                    />
                  </td>
                  <td>{order.site_name ?? "—"}</td>
                  <td>{order.crews?.name ?? "—"}</td>
                  <td>
                    <StatusBadge
                      status={SLA_LABELS[order.sla_tier] ?? order.sla_tier}
                      variant={order.sla_tier === "critical" ? "red" : "steel"}
                    />
                  </td>
                  <td>{formatOperationalDate(order.due_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}
