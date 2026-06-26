"use client";

import type { TodayFilters } from "@/lib/today";
import { CREW_LABELS, SLA_LABELS } from "@/lib/today";

interface TodayFiltersBarProps {
  filters: TodayFilters;
  sites: string[];
  crews: string[];
  onChange: (filters: TodayFilters) => void;
}

export function TodayFiltersBar({ filters, sites, crews, onChange }: TodayFiltersBarProps) {
  return (
    <div className="today-toolbar" role="toolbar" aria-label="Today filters">
      <div className="today-toolbar-group">
        <label className="today-filter">
          <span className="today-filter-label">Site</span>
          <select
            className="today-select today-filter-select"
            value={filters.site}
            onChange={(e) => onChange({ ...filters, site: e.target.value })}
          >
            <option value="all">All sites</option>
            {sites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </label>

        <label className="today-filter">
          <span className="today-filter-label">Crew</span>
          <select
            className="today-select today-filter-select"
            value={filters.crew}
            onChange={(e) => onChange({ ...filters, crew: e.target.value })}
          >
            <option value="all">All crews</option>
            {crews.map((crew) => (
              <option key={crew} value={crew}>
                {CREW_LABELS[crew as keyof typeof CREW_LABELS] ?? crew}
              </option>
            ))}
          </select>
        </label>

        <label className="today-filter">
          <span className="today-filter-label">SLA</span>
          <select
            className="today-select today-filter-select"
            value={filters.sla}
            onChange={(e) => onChange({ ...filters, sla: e.target.value })}
          >
            <option value="all">All SLA tiers</option>
            <option value="breaching">Breaching now</option>
            {(Object.keys(SLA_LABELS) as Array<keyof typeof SLA_LABELS>).map((tier) => (
              <option key={tier} value={tier}>
                {SLA_LABELS[tier]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
