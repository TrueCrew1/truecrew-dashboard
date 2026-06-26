import type {
  AssetFilters,
  AssetRow,
  CrewFilters,
  CrewRow,
  WorkOrderFilters,
  WorkOrderRow,
} from "./types";

function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function deriveWorkOrderFilterOptions(orders: WorkOrderRow[]) {
  const sites = [...new Set(orders.map((o) => o.site_name).filter(Boolean))] as string[];
  const crews = [...new Set(orders.map((o) => o.crews?.name).filter(Boolean))] as string[];
  return { sites: sites.sort(), crews: crews.sort() };
}

export function filterWorkOrders(orders: WorkOrderRow[], filters: WorkOrderFilters): WorkOrderRow[] {
  return orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) return false;
    if (filters.site !== "all" && order.site_name !== filters.site) return false;
    if (filters.crew !== "all" && order.crews?.name !== filters.crew) return false;
    if (filters.sla !== "all" && order.sla_tier !== filters.sla) return false;
    if (
      filters.search &&
      !matchesSearch(
        [order.title, order.assignee, order.site_name, order.legacy_id].filter(Boolean).join(" "),
        filters.search,
      )
    ) {
      return false;
    }
    return true;
  });
}

export function workOrderStats(orders: WorkOrderRow[]) {
  const active = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  return {
    total: orders.length,
    active: active.length,
    inProgress: orders.filter((o) => o.status === "in_progress").length,
    blocked: orders.filter((o) => o.status === "blocked").length,
    overdue: active.filter((o) => o.due_at && new Date(o.due_at) < new Date()).length,
  };
}

export function deriveAssetFilterOptions(assets: AssetRow[]) {
  const sites = [...new Set(assets.map((a) => a.site_name).filter(Boolean))] as string[];
  return { sites: sites.sort() };
}

export function filterAssets(assets: AssetRow[], filters: AssetFilters): AssetRow[] {
  return assets.filter((asset) => {
    if (filters.type !== "all" && asset.asset_type !== filters.type) return false;
    if (filters.site !== "all" && asset.site_name !== filters.site) return false;
    if (filters.status !== "all" && asset.status !== filters.status) return false;
    if (
      filters.search &&
      !matchesSearch(
        [asset.name, asset.serial_number, asset.manufacturer, asset.model, asset.legacy_id]
          .filter(Boolean)
          .join(" "),
        filters.search,
      )
    ) {
      return false;
    }
    return true;
  });
}

export function assetStats(assets: AssetRow[]) {
  return {
    total: assets.length,
    operational: assets.filter((a) => a.status === "operational").length,
    maintenance: assets.filter((a) => a.status === "maintenance").length,
    offline: assets.filter((a) => a.status === "offline").length,
  };
}

export function deriveCrewFilterOptions(crews: CrewRow[]) {
  const sites = [...new Set(crews.map((c) => c.site_name).filter(Boolean))] as string[];
  return { sites: sites.sort() };
}

export function filterCrews(crews: CrewRow[], filters: CrewFilters): CrewRow[] {
  return crews.filter((crew) => {
    if (filters.site !== "all" && crew.site_name !== filters.site) return false;
    if (filters.availability !== "all" && crew.availability !== filters.availability) return false;
    if (
      filters.search &&
      !matchesSearch(
        [crew.name, crew.lead_name, crew.site_name, crew.slug].filter(Boolean).join(" "),
        filters.search,
      )
    ) {
      return false;
    }
    return true;
  });
}

export function crewStats(crews: CrewRow[]) {
  const active = crews.filter((c) => c.active);
  return {
    total: crews.length,
    active: active.length,
    available: active.filter((c) => c.availability === "available").length,
    limited: active.filter((c) => c.availability === "limited").length,
    capacity: active.reduce((sum, c) => sum + c.capacity, 0),
  };
}

export function formatOperationalDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatOperationalDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
