import type { MockData } from "@/data/mockData";
import { runChiefCommand } from "@/components/chief/chiefCommandRunner";
import type { ChiefLiveContext } from "@/components/chief/chiefLiveContext";
import type { ApprovalProposal, ChiefTab, CommandHistoryEntry } from "@/components/chief/types";
import { searchLog } from "./searchLog";
import type { SearchActionKind } from "./types";

export interface ActionRouterDeps {
  navigate: (path: string) => void;
  requestChiefTab: (tab: ChiefTab, filter?: string) => void;
  chief: {
    data: MockData;
    liveContext: ChiefLiveContext;
    approvals: ApprovalProposal[];
    addHistoryEntry: (entry: CommandHistoryEntry) => void;
    addCommandApproval: (proposal: ApprovalProposal) => void;
  };
}

export interface ActionRunOutcome {
  message: string;
  tone: "info" | "success";
}

/**
 * Executes a SearchActionKind against real app state/navigation — the
 * "action routing abstraction" the command bar sits on. Kept separate from
 * CommandBar.tsx so the routing rules (Chief vs. ecosystem, navigate vs.
 * Chief-tab) are unit-testable without rendering React, and so any future
 * caller (another command surface) can reuse the same routing without
 * duplicating it.
 */
export function runSearchAction(action: SearchActionKind, deps: ActionRouterDeps): ActionRunOutcome {
  try {
    const outcome = dispatchSearchAction(action, deps);
    searchLog.actionRouted(action, outcome.message);
    return outcome;
  } catch (error) {
    searchLog.error(describeAction(action), error);
    throw error;
  }
}

function dispatchSearchAction(action: SearchActionKind, deps: ActionRouterDeps): ActionRunOutcome {
  switch (action.type) {
    case "navigate":
      deps.navigate(action.path);
      return { message: `Opened ${action.path}`, tone: "info" };

    case "open_chief_tab":
      deps.requestChiefTab(action.tab, action.filter);
      return {
        message: action.filter
          ? `Opened Chief · ${action.tab}, filtered to "${action.filter}"`
          : `Opened Chief · ${action.tab}`,
        tone: "info",
      };

    case "run_chief_command": {
      const result = runChiefCommand(
        action.command,
        deps.chief.data,
        deps.chief.liveContext,
        deps.chief.approvals,
      );
      deps.chief.addHistoryEntry(result.historyEntry);
      if (result.newApproval) {
        deps.chief.addCommandApproval(result.newApproval);
      }
      // "chief" reveals Chief's own Command tab (its response/history);
      // "ecosystem" reveals the Agents board — the execution layer Chief
      // just routed this to. Both runs go through the same resolver either
      // way; this only decides which tab surfaces the result.
      deps.requestChiefTab(action.target === "ecosystem" ? "agents" : "command");
      return {
        message:
          action.target === "ecosystem"
            ? `Routed to the ecosystem via Chief — ${result.response.summary}`
            : `Routed to Chief — ${result.response.summary}`,
        tone: "success",
      };
    }

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unhandled search action: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

function describeAction(action: SearchActionKind): string {
  switch (action.type) {
    case "navigate":
      return `navigate:${action.path}`;
    case "open_chief_tab":
      return `open_chief_tab:${action.tab}`;
    case "run_chief_command":
      return `run_chief_command:${action.command}`;
    default:
      return "unknown_action";
  }
}
