import type { MockData } from "@/data/mockData";
import type { V2ProgramCard } from "@/data/v2Program";
import type { ResearchRequest } from "@/lib/research/requests";
import type { AgentWorkItem, ApprovalProposal, ChiefSpecialist } from "@/components/chief/types";

export type SearchResultType =
  | "project"
  | "agent"
  | "task"
  | "document"
  | "customer"
  | "workflow"
  | "focus_item"
  | "research_request"
  | "approval"
  | "action";

export type SearchResultSource = "live" | "mock" | "adapter" | "session";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  route?: string;
  routeLabel?: string;
  score: number;
  source: SearchResultSource;
  tags?: string[];
  meta?: Record<string, string | number | boolean | null>;
}

export interface SearchResultGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
}

export type AssignmentTarget = "chief" | "ecosystem" | ChiefSpecialist | "Build Agent";

export type CommandAction =
  | "open_entity"
  | "create_task"
  | "route_to_chief"
  | "route_to_ecosystem"
  | "start_research"
  | "continue_work"
  | "assign_agent"
  | "chief_query";

export type CommandMode = "search" | "action" | "chief_query";

export interface ResolvedTarget {
  entityType?: SearchResultType;
  entityId?: string;
  label: string;
  phrase: string;
}

export interface CommandIntent {
  mode: CommandMode;
  rawQuery: string;
  searchQuery: string;
  action?: CommandAction;
  assignmentTarget?: AssignmentTarget;
  target?: ResolvedTarget;
  topic?: string;
  filters?: {
    types?: SearchResultType[];
    projectSlug?: string;
    agentName?: string;
  };
  confidence: number;
  reason: string;
}

export interface SuggestedAction {
  id: string;
  label: string;
  description: string;
  action: CommandAction;
  assignmentTarget?: AssignmentTarget;
  route?: string;
  payload?: Record<string, string>;
}

export interface SearchResponse {
  query: string;
  intent: CommandIntent;
  groups: SearchResultGroup[];
  suggestedActions: SuggestedAction[];
  totalResults: number;
  tookMs: number;
}

export interface ActionDispatchResult {
  ok: boolean;
  action: CommandAction;
  message: string;
  route?: string;
  routeLabel?: string;
  assignmentTarget?: AssignmentTarget;
  chiefQuery?: string;
  createdEntityId?: string;
  error?: string;
}

export interface SearchDataContext extends MockData {
  /** Data rail backing ctx — drives `source` on live-backed providers. */
  dataRail?: "mock" | "supabase" | "mock-fallback";
  programs: V2ProgramCard[];
  agentWork: AgentWorkItem[];
  researchRequests: ResearchRequest[];
  approvalCandidates?: ApprovalProposal[];
}

export interface SearchLogEvent {
  event: "search" | "intent" | "dispatch" | "failure";
  query: string;
  intent?: CommandIntent;
  resultCount?: number;
  action?: CommandAction;
  route?: string;
  error?: string;
  tookMs?: number;
}
