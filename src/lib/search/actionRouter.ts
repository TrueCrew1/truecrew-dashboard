import { CHIEF_ROUTES } from "@/components/chief/chiefRoutes";
import { topResult } from "./ranker";
import type {
  ActionDispatchResult,
  CommandIntent,
  SearchResponse,
  SuggestedAction,
} from "./types";

export interface ActionDispatchContext {
  navigate?: (path: string) => void;
  focusChief?: (query: string) => void;
}

function buildSuggestedActions(intent: CommandIntent, response: SearchResponse): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const top = topResult(response.groups);

  if (intent.mode === "action" && intent.action) {
    actions.push({
      id: `primary-${intent.action}`,
      label: intent.action.replaceAll("_", " "),
      description: intent.reason,
      action: intent.action,
      assignmentTarget: intent.assignmentTarget,
      route: top?.route,
    });
  }

  if (intent.mode !== "chief_query") {
    actions.push({
      id: "route-chief",
      label: "Ask Chief",
      description: "Route this query through Chief for operational interpretation.",
      action: "route_to_chief",
      assignmentTarget: "chief",
      payload: { query: intent.rawQuery },
    });
  }

  if (intent.mode !== "action" || intent.action !== "route_to_ecosystem") {
    actions.push({
      id: "route-ecosystem",
      label: "Assign to ecosystem",
      description: "Queue this work for ecosystem agents to execute.",
      action: "route_to_ecosystem",
      assignmentTarget: "ecosystem",
      payload: { query: intent.rawQuery },
    });
  }

  if (top?.type === "research_request" || /\bresearch\b/i.test(intent.rawQuery)) {
    actions.push({
      id: "start-research",
      label: "Start research",
      description: "Open a research request for the Research Agent.",
      action: "start_research",
      assignmentTarget: "Research Agent",
      route: CHIEF_ROUTES.knowledge,
      payload: { topic: intent.searchQuery },
    });
  }

  if (top?.type === "task") {
    actions.push({
      id: "continue-task",
      label: "Continue work",
      description: `Resume ${top.title}.`,
      action: "continue_work",
      assignmentTarget: "chief",
      route: top.route,
      payload: { entityId: top.id },
    });
  }

  return actions.slice(0, 4);
}

export function dispatchAction(
  intent: CommandIntent,
  response: SearchResponse,
  ctx: ActionDispatchContext = {},
): ActionDispatchResult {
  const top = topResult(response.groups);
  const phrase = intent.target?.phrase ?? intent.searchQuery;

  switch (intent.action) {
    case "open_entity": {
      if (!top?.route) {
        return {
          ok: false,
          action: "open_entity",
          message: `No matching entity found for "${phrase}".`,
          error: "NOT_FOUND",
        };
      }
      ctx.navigate?.(top.route);
      return {
        ok: true,
        action: "open_entity",
        message: `Opened ${top.title}.`,
        route: top.route,
        routeLabel: top.routeLabel,
      };
    }

    case "create_task": {
      const route = `${CHIEF_ROUTES.operations}?createTask=${encodeURIComponent(phrase)}`;
      ctx.navigate?.(route);
      return {
        ok: true,
        action: "create_task",
        message: `Ready to create task: ${phrase}.`,
        route,
        routeLabel: "Operations",
        assignmentTarget: "chief",
      };
    }

    case "route_to_chief":
    case "chief_query": {
      ctx.focusChief?.(intent.rawQuery);
      return {
        ok: true,
        action: intent.action ?? "route_to_chief",
        message: "Routed to Chief for operational interpretation.",
        route: CHIEF_ROUTES.today,
        routeLabel: "Chief",
        assignmentTarget: "chief",
        chiefQuery: intent.rawQuery,
      };
    }

    case "route_to_ecosystem":
    case "assign_agent": {
      const target = intent.assignmentTarget ?? "ecosystem";
      const route = top?.route ?? CHIEF_ROUTES.today;
      ctx.navigate?.(route);
      return {
        ok: true,
        action: intent.action ?? "route_to_ecosystem",
        message:
          target === "ecosystem"
            ? `Queued "${phrase}" for ecosystem execution.`
            : `Assigned "${phrase}" to ${target}.`,
        route,
        routeLabel: top?.routeLabel ?? "Agents",
        assignmentTarget: target,
      };
    }

    case "start_research": {
      const topic = intent.topic ?? phrase;
      ctx.navigate?.(CHIEF_ROUTES.knowledge);
      ctx.focusChief?.(`Start research on ${topic}`);
      return {
        ok: true,
        action: "start_research",
        message: `Research queued for "${topic}".`,
        route: CHIEF_ROUTES.knowledge,
        routeLabel: "Knowledge",
        assignmentTarget: "Research Agent",
        chiefQuery: `Start research on ${topic}`,
      };
    }

    case "continue_work": {
      if (top?.route) {
        ctx.navigate?.(top.route);
        return {
          ok: true,
          action: "continue_work",
          message: `Continuing ${top.title}.`,
          route: top.route,
          routeLabel: top.routeLabel,
          assignmentTarget: "chief",
        };
      }
      ctx.focusChief?.(`Continue work on ${phrase}`);
      return {
        ok: true,
        action: "continue_work",
        message: `Chief will locate active work for "${phrase}".`,
        route: CHIEF_ROUTES.today,
        routeLabel: "Chief",
        assignmentTarget: "chief",
        chiefQuery: `Continue work on ${phrase}`,
      };
    }

    default: {
      if (top?.route) {
        ctx.navigate?.(top.route);
        return {
          ok: true,
          action: "open_entity",
          message: `Opened top match: ${top.title}.`,
          route: top.route,
          routeLabel: top.routeLabel,
        };
      }
      return {
        ok: false,
        action: "open_entity",
        message: "No actionable match found. Try a more specific query.",
        error: "NO_MATCH",
      };
    }
  }
}

export function buildSuggestedActionsForResponse(
  intent: CommandIntent,
  response: SearchResponse,
): SuggestedAction[] {
  return buildSuggestedActions(intent, response);
}
