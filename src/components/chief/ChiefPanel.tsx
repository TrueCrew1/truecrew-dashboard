import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useData } from "@/context/DataContext";
import {
  ChiefApprovalConflictError,
  formatDataSourceLabel,
  isLiveApiEnabled,
} from "@/lib/api/client";
import { executeProjectSummaryHandoffMission } from "@/lib/api/researchMission";
import { executeMonitorIncidentPostmortemMission } from "@/lib/api/researchPostmortemMission";
import { useProjectSummaryHandoffMissions } from "@/hooks/useProjectSummaryHandoffMissions";
import { useMonitorIncidentPostmortemMissions } from "@/hooks/useMonitorIncidentPostmortemMissions";
import { useApprovalActivity } from "@/hooks/useApprovalActivity";
import {
  incidentIdForResearchMonitorIncidentPostmortemProposal,
  isResearchMonitorIncidentPostmortemProposal,
} from "./researchIncidentProposal";
import {
  mergeResearchMissionsByProposalId,
  type ResearchMissionPayload,
} from "./researchMonitorIncidentPostmortem";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { ApprovalBoard } from "./ApprovalBoard";
import { CommandHistory } from "./CommandHistory";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import { approvalActionSuccessMessage, type ApprovalActionState } from "./chiefApproval";
import {
  isResearchProjectSummaryHandoffProposal,
  projectIdForResearchProjectSummaryHandoffProposal,
} from "./researchProjectSummaryHandoff";
import { classifyChiefEvaluation, evaluationInputFromChiefResponse } from "./chiefDecisionTier";
import { deriveChiefBoardItems, resolveChiefCommand } from "./chiefLiveContext";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { ChiefContextSwitcher } from "./ChiefContextSwitcher";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import { ChiefBoard } from "./ChiefBoard";
import { AgentWorkBoard } from "./AgentWorkBoard";
import { GovernanceEventsPanel } from "./GovernanceEventsPanel";
import { ChiefResponseCard } from "./ChiefResponseCard";
import { ChiefOpsDeskStrip } from "./ChiefOpsDeskStrip";
import {
  CHIEF_DEFAULT_LINE,
  deriveChiefDoingNow,
  deriveChiefOpsDeskSnapshot,
} from "./chiefVoice";
import { chiefLog } from "./chiefLog";
import type { ApprovalAction, ChiefResponse } from "./types";
import type { ApprovalStatusFilter } from "./approvalStatus";
import {
  approvalCardElementId,
  clearChiefApprovalDeepLink,
  parseChiefApprovalDeepLink,
} from "@/lib/navigation/approvalActivityNavigation";

/** Dev-only observability tab — never shown in production builds. */
const SHOW_GOVERNANCE_EVENTS_TAB = import.meta.env.DEV;

const EXAMPLE_COMMANDS = [
  "What is at risk today?",
  "What's blocked?",
  "Show approvals I need to review",
  "What tasks are missing customer context?",
  "Show open alerts",
];

type ChiefTab = "command" | "board" | "agents" | "approvals" | "history" | "dev";

export function ChiefPanel() {
  const { loading, source } = useData();
  const {
    chiefData,
    liveContext,
    approvals,
    pendingApprovalCount,
    proposalsById,
    decisionsHydrated,
    addCommandApproval,
    recordDecision,
    history,
    addHistoryEntry,
    sessionApprovalActivity,
  } = useChiefApprovals();

  const [activeTab, setActiveTab] = useState<ChiefTab>("command");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalActionStates, setApprovalActionStates] = useState<
    Record<string, ApprovalActionState>
  >({});
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ApprovalStatusFilter>("all");
  const [focusProposalId, setFocusProposalId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingDeepLinkRef = useRef<string | null>(null);
  const liveApi = isLiveApiEnabled();
  const { missions: handoffMissions, refresh: refreshHandoffMissions } =
    useProjectSummaryHandoffMissions(30_000);
  const { missions: postmortemMissions, refresh: refreshPostmortemMissions } =
    useMonitorIncidentPostmortemMissions(30_000);
  const [researchMissionOverrides, setResearchMissionOverrides] = useState<
    Record<string, ResearchMissionPayload>
  >({});
  const missionsByProposalId = useMemo(() => {
    const map = mergeResearchMissionsByProposalId(handoffMissions, postmortemMissions);
    for (const [proposalId, mission] of Object.entries(researchMissionOverrides)) {
      map.set(proposalId, mission);
    }
    return map;
  }, [handoffMissions, postmortemMissions, researchMissionOverrides]);
  // Same hook and endpoints Monitor already uses — no new polling or data source.
  const platformHealth = useMonitorHealth();
  const { vaultRecords: approvalVaultRecords } = useApprovalActivity(null);
  const approvalActivityRecords = useMemo(
    () => [...approvalVaultRecords, ...sessionApprovalActivity],
    [approvalVaultRecords, sessionApprovalActivity],
  );

  const openApprovals = useCallback((filter: ApprovalStatusFilter = "all") => {
    setApprovalStatusFilter(filter);
    setActiveTab("approvals");
  }, []);

  useEffect(() => {
    const proposalId = parseChiefApprovalDeepLink(searchParams);
    if (!proposalId) return;

    pendingDeepLinkRef.current = proposalId;
    const proposal = proposalsById.get(proposalId);
    openApprovals(proposal?.status === "pending" ? "pending" : "all");
    setFocusProposalId(proposalId);
  }, [searchParams, proposalsById, openApprovals]);

  useEffect(() => {
    if (!focusProposalId || activeTab !== "approvals") return undefined;

    const proposalId = focusProposalId;
    const timer = window.setTimeout(() => {
      document
        .getElementById(approvalCardElementId(proposalId))
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      if (pendingDeepLinkRef.current === proposalId) {
        pendingDeepLinkRef.current = null;
        setSearchParams(clearChiefApprovalDeepLink(searchParams), { replace: true });
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [focusProposalId, activeTab, searchParams, setSearchParams]);

  const boardItems = useMemo(
    () => deriveChiefBoardItems(liveContext, approvals),
    [liveContext, approvals],
  );

  const blockedItems = useMemo(
    () =>
      boardItems.filter(
        (item) => item.lane === "blocked" && item.id.startsWith("board-blocked-task-"),
      ),
    [boardItems],
  );

  const pendingApprovals = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending"),
    [approvals],
  );

  const doingNow = useMemo(
    () =>
      deriveChiefDoingNow({
        isProcessing,
        pendingApprovals,
        blockedItems,
      }),
    [isProcessing, pendingApprovals, blockedItems],
  );

  const opsDesk = useMemo(
    () =>
      deriveChiefOpsDeskSnapshot({
        pendingApprovals,
        blockedItems,
      }),
    [pendingApprovals, blockedItems],
  );

  const boardSignalCount = boardItems.length;

  const needsAttentionTaskId = useMemo(
    () => boardItems.find((item) => item.needsAttention)?.meta ?? null,
    [boardItems],
  );

  const loggedNeedsAttentionTaskId = useRef<string | null>(null);

  // Logs once per task when the overdue-work reprioritization rule promotes
  // it — not on every board recompute, so re-renders don't spam the log.
  useEffect(() => {
    if (!needsAttentionTaskId || loggedNeedsAttentionTaskId.current === needsAttentionTaskId) {
      return;
    }
    loggedNeedsAttentionTaskId.current = needsAttentionTaskId;

    const task = liveContext.overdueTasks.find((entry) => entry.id === needsAttentionTaskId);
    chiefLog.taskReprioritized(
      needsAttentionTaskId,
      task
        ? `Promoted ${task.id} (${task.title}) to top of At-risk work — overdue since ${task.dueAt}.`
        : `Promoted ${needsAttentionTaskId} to top of At-risk work — overdue.`,
    );
  }, [needsAttentionTaskId, liveContext.overdueTasks]);

  const handleApprovalAction = useCallback(
    async (id: string, action: ApprovalAction) => {
      if (!decisionsHydrated) {
        setApprovalActionStates((prev) => ({
          ...prev,
          [id]: {
            phase: "error",
            action,
            message: "Still loading saved decisions — try again in a moment.",
          },
        }));
        return;
      }

      const proposal = proposalsById.get(id);
      if (!proposal) {
        setApprovalActionStates((prev) => ({
          ...prev,
          [id]: {
            phase: "error",
            action,
            message: "Proposal not found — refresh and try again.",
          },
        }));
        return;
      }

      if (proposal.status !== "pending") {
        setApprovalActionStates((prev) => ({
          ...prev,
          [id]: {
            phase: "error",
            action,
            message: "This proposal was already decided.",
          },
        }));
        return;
      }

      setApprovalActionStates((prev) => ({
        ...prev,
        [id]: { phase: "loading", action },
      }));

      try {
        await recordDecision(id, action);

        if (action === "approved" && liveApi) {
          let launchMission: (() => Promise<ResearchMissionPayload>) | null = null;
          let missingLinkMessage: string | null = null;

          if (isResearchProjectSummaryHandoffProposal(proposal)) {
            const projectId = projectIdForResearchProjectSummaryHandoffProposal(proposal);
            if (projectId) {
              launchMission = () =>
                executeProjectSummaryHandoffMission({
                  proposalId: id,
                  projectId,
                });
            } else {
              missingLinkMessage = "missing project linkage on this approval card.";
            }
          } else if (isResearchMonitorIncidentPostmortemProposal(proposal)) {
            const incidentId = incidentIdForResearchMonitorIncidentPostmortemProposal(proposal);
            if (incidentId) {
              launchMission = () =>
                executeMonitorIncidentPostmortemMission({
                  proposalId: id,
                  incidentId,
                });
            } else {
              missingLinkMessage = "missing incident linkage on this approval card.";
            }
          }

          if (missingLinkMessage) {
            setApprovalActionStates((prev) => ({
              ...prev,
              [id]: {
                phase: "error",
                action,
                message: `Approved, but mission did not run: ${missingLinkMessage}`,
              },
            }));
            return;
          }

          if (launchMission) {
            try {
              const mission = await launchMission();
              setResearchMissionOverrides((prev) => ({ ...prev, [id]: mission }));
              void refreshHandoffMissions();
              void refreshPostmortemMissions();
              setApprovalActionStates((prev) => ({
                ...prev,
                [id]: {
                  phase: "success",
                  action,
                  message: approvalActionSuccessMessage(action, proposal.routeLabel),
                },
              }));
              return;
            } catch (missionError) {
              const missionMessage =
                missionError instanceof Error
                  ? missionError.message
                  : "Research mission failed to start";
              setApprovalActionStates((prev) => ({
                ...prev,
                [id]: {
                  phase: "error",
                  action,
                  message: `Approved, but mission did not run: ${missionMessage}`,
                },
              }));
              return;
            }
          }
        }

        setApprovalActionStates((prev) => ({
          ...prev,
          [id]: {
            phase: "success",
            action,
            message: approvalActionSuccessMessage(action, proposal.routeLabel),
          },
        }));
      } catch (error) {
        if (error instanceof ChiefApprovalConflictError) {
          setApprovalActionStates((prev) => ({
            ...prev,
            [id]: {
              phase: "error",
              action,
              message: "This proposal was already decided.",
            },
          }));
          return;
        }

        setApprovalActionStates((prev) => ({
          ...prev,
          [id]: {
            phase: "error",
            action,
            message: "Decision could not be recorded — try again.",
          },
        }));
      }
    },
    [proposalsById, recordDecision, decisionsHydrated, liveApi, refreshHandoffMissions, refreshPostmortemMissions],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const command = input.trim();
    if (!command || isProcessing) return;

    setIsProcessing(true);
    setActiveTab("command");
    setResponse(null);

    window.setTimeout(() => {
      const resolved = resolveChiefCommand(command, chiefData, liveContext, approvals);
      // Read-only operating-layer classification — chiefDecisionTier.ts never
      // executes or writes anything, it only tags this response with a tier
      // and (when escalating) the reasoning behind it.
      const evaluation = classifyChiefEvaluation(evaluationInputFromChiefResponse(resolved));
      const result: ChiefResponse = {
        ...resolved,
        decisionTier: evaluation.tier,
        approvalPacket: evaluation.approvalPacket,
      };
      setResponse(result);
      addHistoryEntry(buildHistoryEntry(command, result));

      const newApproval = buildApprovalFromResponse(command, result);
      if (newApproval) {
        // Extension point: a "card created" notification hook would fire
        // here too, alongside any future real approval sources (GitHub PRs,
        // agent job queue) that push a new ApprovalCard into this list.
        addCommandApproval(newApproval);
      }

      setIsProcessing(false);
    }, 480);
  };

  const handleExample = (example: string) => {
    setInput(example);
  };

  return (
    <aside className="chief-panel" aria-label="Chief command layer">
      <div className="chief-header">
        <div className="chief-mark" aria-hidden="true">
          C
        </div>
        <div className="chief-header-text">
          <span className="chief-title">Chief</span>
          <span className="chief-subtitle">
            Single command voice
            {loading
              ? " · loading context"
              : source === "mock"
                ? " · mock context"
                : ` · ${formatDataSourceLabel(source)}`}
          </span>
        </div>
        <ChiefContextSwitcher />
      </div>

      <p className="chief-voice-line" title={CHIEF_DEFAULT_LINE}>
        {CHIEF_DEFAULT_LINE}
      </p>

      <ChiefOpsDeskStrip
        doingNow={doingNow}
        snapshot={opsDesk}
        onOpenApprovals={() => openApprovals("pending")}
        onFocusActiveTask={(proposalId) => {
          openApprovals("pending");
          setFocusProposalId(proposalId);
        }}
      />

      <nav className="chief-tabs" aria-label="Chief sections" role="tablist">
        <button
          type="button"
          role="tab"
          id="chief-tab-command"
          aria-selected={activeTab === "command"}
          aria-controls="chief-panel-command"
          className={`chief-tab${activeTab === "command" ? " chief-tab--active" : ""}`}
          onClick={() => setActiveTab("command")}
        >
          Command
        </button>
        <button
          type="button"
          role="tab"
          id="chief-tab-board"
          aria-selected={activeTab === "board"}
          aria-controls="chief-panel-board"
          className={`chief-tab${activeTab === "board" ? " chief-tab--active" : ""}`}
          onClick={() => setActiveTab("board")}
        >
          Board
          {boardSignalCount > 0 ? (
            <span className="chief-tab-badge" aria-label={`${boardSignalCount} on board`}>
              {boardSignalCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id="chief-tab-agents"
          aria-selected={activeTab === "agents"}
          aria-controls="chief-panel-agents"
          className={`chief-tab${activeTab === "agents" ? " chief-tab--active" : ""}`}
          onClick={() => setActiveTab("agents")}
        >
          Agents
        </button>
        <button
          type="button"
          role="tab"
          id="chief-tab-approvals"
          aria-selected={activeTab === "approvals"}
          aria-controls="chief-panel-approvals"
          className={`chief-tab${activeTab === "approvals" ? " chief-tab--active" : ""}`}
          onClick={() => setActiveTab("approvals")}
        >
          Approvals
          {pendingApprovalCount > 0 ? (
            <span className="chief-tab-badge" aria-label={`${pendingApprovalCount} pending`}>
              {pendingApprovalCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id="chief-tab-history"
          aria-selected={activeTab === "history"}
          aria-controls="chief-panel-history"
          className={`chief-tab${activeTab === "history" ? " chief-tab--active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
        {SHOW_GOVERNANCE_EVENTS_TAB ? (
          <button
            type="button"
            role="tab"
            id="chief-tab-dev"
            aria-selected={activeTab === "dev"}
            aria-controls="chief-panel-dev"
            className={`chief-tab${activeTab === "dev" ? " chief-tab--active" : ""}`}
            onClick={() => setActiveTab("dev")}
          >
            Dev
          </button>
        ) : null}
      </nav>

      <div className="chief-body">
        {activeTab === "command" ? (
          <div
            id="chief-panel-command"
            role="tabpanel"
            aria-labelledby="chief-tab-command"
            className="chief-tab-panel"
          >
            <ChiefSituationBrief
              context={liveContext}
              pendingApprovalCount={pendingApprovalCount}
              onOpenApprovals={() => openApprovals("pending")}
              platformHealth={platformHealth}
              liveApiEnabled={liveApi}
            />

            {!response && !isProcessing ? (
              <div className="chief-empty">
                <p className="chief-empty-lead">Ask Chief</p>
                <p className="chief-empty-desc">
                  Status, recommendation, and next action — short and operational. Nothing
                  gated executes without your approval.
                </p>
                <div className="chief-examples">
                  <span className="chief-examples-label">Examples</span>
                  {EXAMPLE_COMMANDS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="chief-example-btn"
                      onClick={() => handleExample(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isProcessing ? (
              <div className="chief-processing-card" aria-live="polite" aria-busy="true">
                <div className="chief-processing-header">
                  <span className="chief-processing-dot" aria-hidden="true" />
                  Chief is routing…
                </div>
                <div className="chief-processing-lines" aria-hidden="true">
                  <span className="chief-skeleton-line chief-skeleton-line--long" />
                  <span className="chief-skeleton-line chief-skeleton-line--medium" />
                  <span className="chief-skeleton-line chief-skeleton-line--short" />
                </div>
              </div>
            ) : null}

            {response && !isProcessing ? (
              <ChiefResponseCard
                response={response}
                onOpenApprovals={() => openApprovals()}
              />
            ) : null}
          </div>
        ) : null}

        {activeTab === "board" ? (
          <div
            id="chief-panel-board"
            role="tabpanel"
            aria-labelledby="chief-tab-board"
            className="chief-tab-panel"
          >
            <ChiefBoard
              items={boardItems}
              pendingApprovalCount={pendingApprovalCount}
              proposalsById={proposalsById}
              approvalActionStates={approvalActionStates}
              onApprovalAction={handleApprovalAction}
              onOpenApprovals={() => openApprovals("pending")}
              missionsByProposalId={missionsByProposalId}
              liveApiEnabled={liveApi}
            />
          </div>
        ) : null}

        {activeTab === "agents" ? (
          <div
            id="chief-panel-agents"
            role="tabpanel"
            aria-labelledby="chief-tab-agents"
            className="chief-tab-panel"
          >
            <AgentWorkBoard />
          </div>
        ) : null}

        {activeTab === "approvals" ? (
          <div
            id="chief-panel-approvals"
            role="tabpanel"
            aria-labelledby="chief-tab-approvals"
            className="chief-tab-panel"
          >
            <ApprovalBoard
              proposals={approvals}
              approvalActionStates={approvalActionStates}
              onApprovalAction={handleApprovalAction}
              statusFilter={approvalStatusFilter}
              onStatusFilterChange={setApprovalStatusFilter}
              focusProposalId={focusProposalId}
              missionsByProposalId={missionsByProposalId}
              liveApiEnabled={liveApi}
              approvalActivityRecords={approvalActivityRecords}
            />
          </div>
        ) : null}

        {activeTab === "history" ? (
          <div
            id="chief-panel-history"
            role="tabpanel"
            aria-labelledby="chief-tab-history"
            className="chief-tab-panel"
          >
            <CommandHistory entries={history} />
          </div>
        ) : null}

        {activeTab === "dev" && SHOW_GOVERNANCE_EVENTS_TAB ? (
          <div
            id="chief-panel-dev"
            role="tabpanel"
            aria-labelledby="chief-tab-dev"
            className="chief-tab-panel"
          >
            <GovernanceEventsPanel />
          </div>
        ) : null}
      </div>

      <form className="chief-input-form" onSubmit={handleSubmit}>
        <label className="chief-input-label" htmlFor="chief-command">
          Command
        </label>
        <div className="chief-input-row">
          <input
            id="chief-command"
            type="text"
            className="chief-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. What is at risk today?"
            aria-label="Chief command input"
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="chief-submit"
            disabled={!input.trim() || isProcessing}
            title={!input.trim() ? "Enter a command to run" : undefined}
          >
            Run
          </button>
        </div>
      </form>
    </aside>
  );
}
