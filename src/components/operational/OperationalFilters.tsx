"use client";

import type { ReactNode } from "react";

interface FilterSelect {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

interface OperationalFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selects: FilterSelect[];
  children?: ReactNode;
}

export function OperationalFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  selects,
  children,
}: OperationalFiltersProps) {
  return (
    <div className="page-toolbar" role="toolbar" aria-label="Filters">
      <div className="page-toolbar-group">
        <input
          type="search"
          className="page-input ops-search-input"
          placeholder={searchPlaceholder}
          aria-label="Search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {selects.map((select) => (
          <label key={select.id} className="ops-filter">
            <span className="ops-filter-label">{select.label}</span>
            <select
              className="page-select ops-filter-select"
              aria-label={select.label}
              value={select.value}
              onChange={(e) => select.onChange(e.target.value)}
            >
              {select.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {children ? <div className="page-toolbar-group">{children}</div> : null}
    </div>
  );
}
