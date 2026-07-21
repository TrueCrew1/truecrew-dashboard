import type { ChiefTab } from "@/components/chief/types";

export type SearchResultGroupId =
  | "continueWork"
  | "agents"
  | "projects"
  | "tasks"
  | "documents"
  | "actions";

export type SearchResultKind = "agent" | "project" | "task" | "document" | "action";

interface SearchResultBase {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

/** A real entity in app state — a task, workflow, agent, or document. */
export interface EntitySearchResult extends SearchResultBase {
  kind: "agent" | "project" | "task" | "document";
  /** In-app route to navigate to when this result is selected. */
  route?: string;
  /** When set, selecting this result also opens the context rail for this entity (tasks/workflows only). */
  entityId?: string;
  /** When set, selecting this result asks Chief to switch to this tab (used by agent results). */
  chiefTab?: ChiefTab;
  /** Filter text to hand to that Chief tab (currently only the Agents board reads it). */
  chiefFilter?: string;
}

/** What happens when a suggested action is invoked. Kept as a small closed union so every action is explicit about routing to Chief vs. plain navigation — no implicit backend calls. */
export type SearchActionKind =
  | { type: "navigate"; path: string }
  | { type: "run_chief_command"; command: string; target: "chief" | "ecosystem" }
  | { type: "open_chief_tab"; tab: ChiefTab; filter?: string };

/** A suggested action derived from parsing the query as an instruction rather than a lookup. */
export interface ActionSearchResult extends SearchResultBase {
  kind: "action";
  action: SearchActionKind;
}

export type SearchResultItem = EntitySearchResult | ActionSearchResult;

export interface SearchResultGroup {
  id: SearchResultGroupId;
  label: string;
  items: SearchResultItem[];
}

export type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";
