import type { TodayFilters } from "@/lib/today/types";

const SITES = [
  { value: "all", label: "All sites" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "internal", label: "Internal" },
] as const;

const CREWS = [
  { value: "all", label: "All crews" },
  { value: "platform", label: "Platform" },
  { value: "support", label: "Support" },
  { value: "founder", label: "Founder" },
  { value: "operator", label: "Operator" },
] as const;

const SLA_TIERS = [
  { value: "all", label: "All SLA" },
  { value: "p0", label: "P0 — Critical" },
  { value: "p1", label: "P1 — High" },
  { value: "p2", label: "P2 — Standard" },
  { value: "p3", label: "P3 — Best effort" },
] as const;

interface TodayFiltersBarProps {
  filters: TodayFilters;
  onChange: (filters: TodayFilters) => void;
  taskCount: number;
  source: string;
}

export function TodayFiltersBar({
  filters,
  onChange,
  taskCount,
  source,
}: TodayFiltersBarProps) {
  return (
    <div className="today-filters">
      <div className="today-filters-group">
        <label className="today-filter">
          <span>Site</span>
          <select
            value={filters.site}
            onChange={(e) =>
              onChange({ ...filters, site: e.target.value as TodayFilters["site"] })
            }
          >
            {SITES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="today-filter">
          <span>Crew</span>
          <select
            value={filters.crew}
            onChange={(e) =>
              onChange({ ...filters, crew: e.target.value as TodayFilters["crew"] })
            }
          >
            {CREWS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="today-filter">
          <span>SLA</span>
          <select
            value={filters.slaTier}
            onChange={(e) =>
              onChange({
                ...filters,
                slaTier: e.target.value as TodayFilters["slaTier"],
              })
            }
          >
            {SLA_TIERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="today-filters-meta">
        <span className="today-source-badge">{source}</span>
        <span>{taskCount} active tasks</span>
      </div>
    </div>
  );
}
