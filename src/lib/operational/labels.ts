export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  blocked: "Blocked",
  waiting: "Waiting",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const WORK_ORDER_STATUS_VARIANT: Record<
  string,
  "green" | "red" | "yellow" | "orange" | "blue" | "steel"
> = {
  draft: "steel",
  open: "blue",
  in_progress: "green",
  blocked: "red",
  waiting: "yellow",
  completed: "green",
  cancelled: "steel",
};

export const PRIORITY_VARIANT: Record<
  string,
  "green" | "red" | "yellow" | "orange" | "blue" | "steel"
> = {
  critical: "red",
  high: "orange",
  medium: "steel",
  low: "green",
};

export const SLA_LABELS: Record<string, string> = {
  critical: "Critical (4h)",
  standard: "Standard (24h)",
  routine: "Routine (72h)",
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  equipment: "Equipment",
  vehicle: "Vehicle",
  facility: "Facility",
  tool: "Tool",
  component: "Component",
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  operational: "Operational",
  maintenance: "Maintenance",
  offline: "Offline",
  retired: "Retired",
};

export const ASSET_STATUS_VARIANT: Record<
  string,
  "green" | "red" | "yellow" | "orange" | "blue" | "steel"
> = {
  operational: "green",
  maintenance: "yellow",
  offline: "red",
  retired: "steel",
};

export const CREW_AVAILABILITY_LABELS: Record<string, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Unavailable",
};

export const CREW_AVAILABILITY_VARIANT: Record<
  string,
  "green" | "red" | "yellow" | "orange" | "blue" | "steel"
> = {
  available: "green",
  limited: "yellow",
  unavailable: "red",
};
