import type { Database } from "@/types/database";

export type WorkOrderRow = Database["public"]["Tables"]["work_orders"]["Row"] & {
  crews?: Pick<CrewRow, "id" | "name" | "slug"> | null;
  assets?: Pick<AssetRow, "id" | "name" | "legacy_id"> | null;
};

export type AssetRow = Database["public"]["Tables"]["assets"]["Row"] & {
  crews?: Pick<CrewRow, "id" | "name" | "slug"> | null;
};

export type CrewRow = Database["public"]["Tables"]["crews"]["Row"];

export type WorkOrderFilters = {
  search: string;
  status: string;
  site: string;
  crew: string;
  sla: string;
};

export type AssetFilters = {
  search: string;
  type: string;
  site: string;
  status: string;
};

export type CrewFilters = {
  search: string;
  site: string;
  availability: string;
};
