"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, PageShell, StatGrid, StatusBadge } from "@/components/ui";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_VARIANT,
  ASSET_TYPE_LABELS,
  assetStats,
  deriveAssetFilterOptions,
  filterAssets,
  formatOperationalDateShort,
  type AssetFilters,
  type AssetRow,
} from "@/lib/operational";
import { OperationalFilters } from "./OperationalFilters";

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  ...Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function AssetsListView({ initialAssets }: { initialAssets: AssetRow[] }) {
  const [filters, setFilters] = useState<AssetFilters>({
    search: "",
    type: "all",
    site: "all",
    status: "all",
  });

  const options = useMemo(() => deriveAssetFilterOptions(initialAssets), [initialAssets]);
  const filtered = useMemo(
    () => filterAssets(initialAssets, filters),
    [initialAssets, filters],
  );
  const stats = useMemo(() => assetStats(initialAssets), [initialAssets]);

  const siteOptions = [
    { value: "all", label: "All sites" },
    ...options.sites.map((s) => ({ value: s, label: s })),
  ];

  return (
    <PageShell>
      <PageHeader
        kicker="Operations"
        title="Assets"
        description="Equipment, vehicles, and facilities tracked by type, site, and operational status."
      />

      <StatGrid
        stats={[
          { label: "Total assets", value: stats.total },
          { label: "Operational", value: stats.operational },
          { label: "In maintenance", value: stats.maintenance },
          { label: "Offline", value: stats.offline },
        ]}
      />

      <OperationalFilters
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        searchPlaceholder="Search assets…"
        selects={[
          {
            id: "type",
            label: "Type",
            value: filters.type,
            onChange: (type) => setFilters((f) => ({ ...f, type })),
            options: TYPE_OPTIONS,
          },
          {
            id: "site",
            label: "Site",
            value: filters.site,
            onChange: (site) => setFilters((f) => ({ ...f, site })),
            options: siteOptions,
          },
          {
            id: "status",
            label: "Status",
            value: filters.status,
            onChange: (status) => setFilters((f) => ({ ...f, status })),
            options: STATUS_OPTIONS,
          },
        ]}
      />

      <section className="panel">
        {filtered.length === 0 ? (
          <div className="page-state">
            <h2 className="page-state-title">No assets match</h2>
            <p className="page-state-copy">Adjust filters or run db:push to load seed data.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Site</th>
                <th>Status</th>
                <th>Crew</th>
                <th>Next service</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id} className="clickable-row">
                  <td>
                    <Link href={`/assets/${asset.id}`} className="ops-table-link">
                      <span className="ops-table-title">{asset.name}</span>
                      <span className="ops-table-meta">
                        {asset.serial_number ?? asset.legacy_id ?? "No serial"}
                      </span>
                    </Link>
                  </td>
                  <td>{ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}</td>
                  <td>{asset.site_name ?? "—"}</td>
                  <td>
                    <StatusBadge
                      status={ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                      variant={ASSET_STATUS_VARIANT[asset.status] ?? "steel"}
                    />
                  </td>
                  <td>{asset.crews?.name ?? "—"}</td>
                  <td>{formatOperationalDateShort(asset.next_service_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}
