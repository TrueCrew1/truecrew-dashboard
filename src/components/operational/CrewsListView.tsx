"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, PageShell, StatGrid, StatusBadge } from "@/components/ui";
import {
  CREW_AVAILABILITY_LABELS,
  CREW_AVAILABILITY_VARIANT,
  crewStats,
  deriveCrewFilterOptions,
  filterCrews,
  type CrewFilters,
  type CrewRow,
} from "@/lib/operational";
import { OperationalFilters } from "./OperationalFilters";

const AVAILABILITY_OPTIONS = [
  { value: "all", label: "All availability" },
  ...Object.entries(CREW_AVAILABILITY_LABELS).map(([value, label]) => ({ value, label })),
];

export function CrewsListView({ initialCrews }: { initialCrews: CrewRow[] }) {
  const [filters, setFilters] = useState<CrewFilters>({
    search: "",
    site: "all",
    availability: "all",
  });

  const options = useMemo(() => deriveCrewFilterOptions(initialCrews), [initialCrews]);
  const filtered = useMemo(
    () => filterCrews(initialCrews, filters),
    [initialCrews, filters],
  );
  const stats = useMemo(() => crewStats(initialCrews), [initialCrews]);

  const siteOptions = [
    { value: "all", label: "All sites" },
    ...options.sites.map((s) => ({ value: s, label: s })),
  ];

  return (
    <PageShell>
      <PageHeader
        kicker="Operations"
        title="Crews"
        description="Field teams by capacity, availability, and assigned site."
      />

      <StatGrid
        stats={[
          { label: "Active crews", value: stats.active, meta: `${stats.total} total` },
          { label: "Available", value: stats.available },
          { label: "Limited", value: stats.limited },
          { label: "Total capacity", value: stats.capacity, meta: "Seats across crews" },
        ]}
      />

      <OperationalFilters
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        searchPlaceholder="Search crews…"
        selects={[
          {
            id: "site",
            label: "Site",
            value: filters.site,
            onChange: (site) => setFilters((f) => ({ ...f, site })),
            options: siteOptions,
          },
          {
            id: "availability",
            label: "Availability",
            value: filters.availability,
            onChange: (availability) => setFilters((f) => ({ ...f, availability })),
            options: AVAILABILITY_OPTIONS,
          },
        ]}
      />

      <section className="panel">
        {filtered.length === 0 ? (
          <div className="page-state">
            <h2 className="page-state-title">No crews match</h2>
            <p className="page-state-copy">Adjust filters or run db:push to load seed data.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Crew</th>
                <th>Site</th>
                <th>Capacity</th>
                <th>Availability</th>
                <th>Lead</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((crew) => (
                <tr key={crew.id} className="clickable-row">
                  <td>
                    <Link href={`/crews/${crew.id}`} className="ops-table-link">
                      <span className="ops-table-title">{crew.name}</span>
                      <span className="ops-table-meta">{crew.slug}</span>
                    </Link>
                  </td>
                  <td>{crew.site_name ?? "—"}</td>
                  <td>
                    <span className="ops-capacity">{crew.capacity}</span>
                  </td>
                  <td>
                    <StatusBadge
                      status={CREW_AVAILABILITY_LABELS[crew.availability] ?? crew.availability}
                      variant={CREW_AVAILABILITY_VARIANT[crew.availability] ?? "steel"}
                    />
                  </td>
                  <td>{crew.lead_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}
