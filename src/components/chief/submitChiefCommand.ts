/**
 * Shared Chief command submit path for Home, sidebar, and any future entry points.
 * Live API → POST /api/chief/command (deterministic + AI fallback).
 * Demo/mock mode → local resolveChiefCommand only (no AI fallback).
 */

import type { MockData } from "@/data/mockData";
import { isLiveApiEnabled } from "@/lib/api/client";
import { fetchChiefCommand } from "@/lib/api/chiefCommand";
import type { ChiefCommandSource } from "../../../lib/chief/commandTypes";
import {
  classifyChiefEvaluation,
  evaluationInputFromChiefResponse,
} from "./chiefDecisionTier";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import { resolveChiefCommand, type ChiefLiveContext } from "./chiefLiveContext";
import type { ApprovalProposal, ChiefResponse, CommandHistoryEntry } from "./types";

export interface SubmitChiefCommandArgs {
  prompt: string;
  source: ChiefCommandSource;
  data: MockData;
  liveContext: ChiefLiveContext;
  approvals: ApprovalProposal[];
  addHistoryEntry: (entry: CommandHistoryEntry) => void;
  addCommandApproval: (proposal: ApprovalProposal) => void;
  /** When true (default), attach decision-tier classification like the sidebar did. */
  classify?: boolean;
  context?: { page?: string; section?: string };
}

export interface SubmitChiefCommandResult {
  response: ChiefResponse;
  error: string | null;
}

function toChiefResponse(result: {
  summary: string;
  blockers?: string[];
  recommendedAction: string;
  approvalNeeded?: boolean;
  approvalPrompt?: string;
  approvalTitle?: string;
  riskNote?: string;
  routedTo: ChiefResponse["routedTo"];
  specialists?: ChiefResponse["specialists"];
  matched?: boolean;
  resolution?: ChiefResponse["resolution"];
  missionKind?: string;
  missionProjectId?: string;
}): ChiefResponse {
  return {
    summary: result.summary,
    blockers: result.blockers,
    recommendedAction: result.recommendedAction,
    approvalNeeded: result.approvalNeeded,
    approvalPrompt: result.approvalPrompt,
    approvalTitle: result.approvalTitle,
    riskNote: result.riskNote,
    routedTo: result.routedTo,
    specialists: result.specialists,
    matched: result.matched,
    resolution: result.resolution,
    missionKind: result.missionKind,
    missionProjectId: result.missionProjectId,
  };
}

function maybeClassify(response: ChiefResponse, classify: boolean): ChiefResponse {
  if (!classify) return response;
  const evaluation = classifyChiefEvaluation(evaluationInputFromChiefResponse(response));
  return {
    ...response,
    decisionTier: evaluation.tier,
    approvalPacket: evaluation.approvalPacket,
  };
}

/**
 * Runs the command, updates shared history, and enqueues approvals when needed.
 */
export async function submitChiefCommand(
  args: SubmitChiefCommandArgs,
): Promise<SubmitChiefCommandResult> {
  const trimmed = args.prompt.trim();
  if (!trimmed) {
    return {
      response: {
        summary: "Enter a command for Chief.",
        recommendedAction: "Ask about risk today, blockers, approvals, or propose a postmortem/handoff.",
        routedTo: "Chief",
        matched: false,
        resolution: "deterministic",
      },
      error: null,
    };
  }

  const classify = args.classify !== false;

  try {
    let response: ChiefResponse;

    if (isLiveApiEnabled()) {
      const apiResult = await fetchChiefCommand({
        prompt: trimmed,
        source: args.source,
        context: args.context,
        liveContext: {
          stats: {
            openWorkOrders: args.liveContext.stats.openWorkOrders,
            overduePMs: args.liveContext.stats.overduePMs,
          },
          focusItems: args.liveContext.focusItems,
          alerts: args.liveContext.alerts,
          openTaskCount: args.liveContext.openTaskCount,
          blockingTasks: args.liveContext.blockingTasks,
          overdueTasks: args.liveContext.overdueTasks,
          tasksMissingCustomer: args.liveContext.tasksMissingCustomer,
          tasksMissingWorkflow: args.liveContext.tasksMissingWorkflow,
          activeIncidents: args.liveContext.activeIncidents,
          blockedDeploys: args.liveContext.blockedDeploys,
          waitingCustomers: args.liveContext.waitingCustomers,
        },
        knowledge: {
          runbooks: args.data.runbooks.map((entry) => ({
            title: entry.title,
            tags: entry.tags,
          })),
          prompts: args.data.prompts.map((entry) => ({
            title: entry.title,
            tags: entry.tags,
          })),
          notes: args.data.notes.map((entry) => ({ title: entry.title })),
        },
        workflows: args.data.workflows.map((workflow) => ({
          id: workflow.id,
          title: workflow.title,
          stage: workflow.stage,
          owner: workflow.owner,
          summary: workflow.summary,
          linkedTaskIds: workflow.linkedTaskIds,
        })),
        approvals: args.approvals.map((proposal) => ({
          id: proposal.id,
          title: proposal.title,
          summary: proposal.summary,
          status: proposal.status,
          specialist: proposal.specialist,
          category: proposal.category,
          riskNote: proposal.riskNote,
        })),
      });
      response = toChiefResponse(apiResult);
    } else {
      const local = resolveChiefCommand(
        trimmed,
        args.data,
        args.liveContext,
        args.approvals,
      );
      // Demo mode: deterministic only — no AI fallback without the API.
      if (local.matched === false) {
        response = {
          ...local,
          resolution: "ai_fallback_unavailable",
          summary: `${local.summary} (Demo mode — AI fallback requires live API + Azure config.)`,
        };
      } else {
        response = local;
      }
    }

    response = maybeClassify(response, classify);
    args.addHistoryEntry(buildHistoryEntry(trimmed, response, "completed"));

    const newApproval = buildApprovalFromResponse(trimmed, response);
    if (newApproval) {
      const alreadyPending = args.approvals.some(
        (proposal) => proposal.id === newApproval.id && proposal.status === "pending",
      );
      if (!alreadyPending) {
        args.addCommandApproval(newApproval);
      }
    }

    return { response, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chief command failed";
    const failedResponse: ChiefResponse = {
      summary: `Command failed: ${message}`,
      recommendedAction: "Check live API / internal key, then retry.",
      routedTo: "Chief",
      matched: false,
      resolution: "ai_fallback_unavailable",
    };
    args.addHistoryEntry(buildHistoryEntry(trimmed, failedResponse, "failed"));
    return { response: failedResponse, error: message };
  }
}
