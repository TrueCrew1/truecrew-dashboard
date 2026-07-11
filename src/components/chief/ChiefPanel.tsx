import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { ChiefApprovalConflictError, formatDataSourceLabel, isLiveApiEnabled } from "@/lib/api/client";
import {
  buildChiefDecisionPayloadFromProposal,
  enqueueLibrarianChiefDecision,
  librarianDecisionIdempotencyKey,
} from "@/lib/api/librarianRuntime";
import {
  buildMaintenanceTaskPayloadFromProposal,
  enqueueMaintenanceTask,
  maintenanceTaskIdempotencyKey,
} from "@/lib/api/maintenanceRuntime";
import {
  buildPlannerTaskPayloadFromProposal,
  enqueuePlannerWorkItem,
  plannerTaskIdempotencyKey,
} from "@/lib/api/plannerRuntime";
import { useLibrarianWorkItems } from "@/hooks/useLibrarianWorkItems";
import { useMaintenanceWorkItems } from "@/hooks/useMaintenanceWorkItems";
import { usePlannerWorkItems } from "@/hooks/usePlannerWorkItems";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { ApprovalBoard } from "./ApprovalBoard";
import { CommandHistory } from "./CommandHistory";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import { approvalActionSuccessMessage, APPROVAL_STATUS_LABEL, type ApprovalActionState } from "./chiefApproval";
import {
  deriveAgentAwaitingApprovalWorkItems,
  deriveChiefBoardItems,
  resolveChiefCommand,
} from "./chiefLiveContext";
import { summarizePendingApprovalUrgency } from "./chiefApprovalUrgency";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import type { OpenAgentsOptions, OpenApprovalsOptions } from "./ChiefApprovalsContext";
import { SpecialistCards } from "./SpecialistCards";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import { ChiefBoard } from "./ChiefBoard";
import { AgentWorkBoard } from "./AgentWorkBoard";
import { AgentActivityTimeline } from "./AgentActivityTimeline";
import { GovernanceEventsPanel } from "./GovernanceEventsPanel";
import { ChiefApprovalAuditPanel } from "./ChiefApprovalAuditPanel";
import type { ApprovalAction, ApprovalProposal, ChiefResponse } from "./types";
import type { ApprovalStatusFilter } from "./approvalStatus";

const EXAMPLE_COMMANDS = [
  "What is at risk today?",
  "What's blocked?",
  "Show approvals I need to review",
  "What tasks are missing customer context?",
  "Show open alerts",
];

type ChiefTab = "command" | "board" | "agents" | "timeline" | "approvals" | "history" | "governance";

const FOCUS_HIGHLIGHT_MS = 2000;
const SHOW_GOVERNANCE_TAB = import.meta.env.DEV;

export function ChiefPanel() {
  const { data, loading, source } = useData();
  const {
    liveContext,
    approvals,
    pendingApprovalCount,
    proposalsById,
    decisionsHydrated,
    decisionsHydrationError,
    addCommandApproval,
    recordDecision,
    history,
    addHistoryEntry,
    registerNavigation,
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
  const [scrollAgentsToAwaiting, setScrollAgentsToAwaiting] = useState(false);
  const liveApi = isLiveApiEnabled();
  // Same hook and endpoints Monitor already uses — no new polling or data source.
  const platformHealth = useMonitorHealth();
  const {
    byProposalId: librarianWorkByProposalId,
    refetch: refetchLibrarianWorkItems,
  } = useLibrarianWorkItems();
  const [filingProposalId, setFilingProposalId] = useState<string | null>(null);
  const [fileVaultFeedback, setFileVaultFeedback] = useState<string | null>(null);
  const {
    byProposalId: maintenanceWorkByProposalId,
    refetch: refetchMaintenanceWorkItems,
  } = useMaintenanceWorkItems();
  const [filingMaintenanceProposalId, setFilingMaintenanceProposalId] = useState<string | null>(
    null,
  );
  const [fileMaintenanceFeedback, setFileMaintenanceFeedback] = useState<string | null>(null);
  const {
    byProposalId: plannerWorkByProposalId,
    refetch: refetchPlannerWorkItems,
  } = usePlannerWorkItems();
  const [filingPlannerProposalId, setFilingPlannerProposalId] = useState<string | null>(null);
  const [filePlannerFeedback, setFilePlannerFeedback] = useState<string | null>(null);

  const openApprovals = useCallback((options?: OpenApprovalsOptions) => {
    setApprovalStatusFilter(options?.filter ?? "all");
    setActiveTab("approvals");
    if (options?.focusProposalId) {
      setFocusProposalId(options.focusProposalId);
    }
  }, []);

  const openAgents = useCallback((options?: OpenAgentsOptions) => {
    void options;
    setActiveTab("agents");
    setScrollAgentsToAwaiting(true);
  }, []);

  useEffect(() => {
    registerNavigation({ openApprovals, openAgents });
    return () => registerNavigation(null);
  }, [openApprovals, openAgents, registerNavigation]);

  useEffect(() => {
    if (!focusProposalId || activeTab !== "approvals") return;

    const scrollTimer = window.setTimeout(() => {
      document
        .getElementById(`approval-proposal-${focusProposalId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);

    const clearTimer = window.setTimeout(() => {
      setFocusProposalId(null);
    }, FOCUS_HIGHLIGHT_MS);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [focusProposalId, activeTab]);

  useEffect(() => {
    if (activeTab !== "agents" || !scrollAgentsToAwaiting) return;

    const scrollTimer = window.setTimeout(() => {
      document
        .getElementById("agent-work-lane-awaiting_approval")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setScrollAgentsToAwaiting(false);
    }, 50);

    return () => window.clearTimeout(scrollTimer);
  }, [activeTab, scrollAgentsToAwaiting]);

  const awaitingApprovalCount = useMemo(
    () => deriveAgentAwaitingApprovalWorkItems(approvals).length,
    [approvals],
  );

  const pendingUrgency = useMemo(
    () => summarizePendingApprovalUrgency(approvals),
    [approvals],
  );

  const boardItems = useMemo(
    () => deriveChiefBoardItems(liveContext, approvals),
    [liveContext, approvals],
  );

  const boardSignalCount = boardItems.length;

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
    [proposalsById, recordDecision, decisionsHydrated],
  );

  const handleFileDecisionToVault = useCallback(
    async (proposal: ApprovalProposal) => {
      if (!liveApi) return;

      setFilingProposalId(proposal.id);
      setFileVaultFeedback(null);

      try {
        const existing = librarianWorkByProposalId.get(proposal.id);
        const idempotencyKey =
          existing?.status === "failed"
            ? `${librarianDecisionIdempotencyKey(proposal.id)}:retry:${Date.now()}`
            : librarianDecisionIdempotencyKey(proposal.id);

        await enqueueLibrarianChiefDecision({
          triggerType: "reactive",
          chiefProposalId: proposal.id,
          idempotencyKey,
          inputPayload: buildChiefDecisionPayloadFromProposal({
            proposalId: proposal.id,
            title: proposal.title,
            summary: proposal.summary,
            recommendedAction: proposal.recommendedAction,
            riskNote: proposal.riskNote,
            decisionLabel: APPROVAL_STATUS_LABEL[proposal.status],
          }),
        });
        await refetchLibrarianWorkItems();
        setFileVaultFeedback("Queued for vault — run npm run librarian:run locally.");
      } catch (error) {
        setFileVaultFeedback(
          error instanceof Error ? error.message : "Could not queue vault filing.",
        );
      } finally {
        setFilingProposalId(null);
      }
    },
    [liveApi, librarianWorkByProposalId, refetchLibrarianWorkItems],
  );

  const handleFileMaintenanceTask = useCallback(
    async (proposal: ApprovalProposal) => {
      if (!liveApi) return;

      setFilingMaintenanceProposalId(proposal.id);
      setFileMaintenanceFeedback(null);

      try {
        const existing = maintenanceWorkByProposalId.get(proposal.id);
        const idempotencyKey =
          existing?.status === "failed"
            ? `${maintenanceTaskIdempotencyKey(proposal.id)}:retry:${Date.now()}`
            : maintenanceTaskIdempotencyKey(proposal.id);

        await enqueueMaintenanceTask({
          triggerType: "reactive",
          chiefProposalId: proposal.id,
          idempotencyKey,
          inputPayload: buildMaintenanceTaskPayloadFromProposal({
            proposalId: proposal.id,
            title: proposal.title,
            summary: proposal.summary,
            recommendedAction: proposal.recommendedAction,
            riskNote: proposal.riskNote,
            decisionLabel: APPROVAL_STATUS_LABEL[proposal.status],
          }),
        });
        await refetchMaintenanceWorkItems();
        setFileMaintenanceFeedback("Queued for maintenance — run npm run maintenance:run locally.");
      } catch (error) {
        setFileMaintenanceFeedback(
          error instanceof Error ? error.message : "Could not queue maintenance filing.",
        );
      } finally {
        setFilingMaintenanceProposalId(null);
      }
    },
    [liveApi, maintenanceWorkByProposalId, refetchMaintenanceWorkItems],
  );

  const handleFileDecisionToPlanner = useCallback(
    async (proposal: ApprovalProposal) => {
      if (!liveApi) return;

      setFilingPlannerProposalId(proposal.id);
      setFilePlannerFeedback(null);

      try {
        const existing = plannerWorkByProposalId.get(proposal.id);
        const idempotencyKey =
          existing?.status === "failed"
            ? `${plannerTaskIdempotencyKey(proposal.id)}:retry:${Date.now()}`
            : plannerTaskIdempotencyKey(proposal.id);

        await enqueuePlannerWorkItem({
          triggerType: "reactive",
          chiefProposalId: proposal.id,
          idempotencyKey,
          inputPayload: buildPlannerTaskPayloadFromProposal({
            proposalId: proposal.id,
            title: proposal.title,
            summary: proposal.summary,
            recommendedAction: proposal.recommendedAction,
            riskNote: proposal.riskNote,
            decisionLabel: APPROVAL_STATUS_LABEL[proposal.status],
          }),
        });
        await refetchPlannerWorkItems();
        setFilePlannerFeedback("Queued for Planner — run npm run planner:run locally.");
      } catch (error) {
        setFilePlannerFeedback(
          error instanceof Error ? error.message : "Could not queue Planner filing.",
        );
      } finally {
        setFilingPlannerProposalId(null);
      }
    },
    [liveApi, plannerWorkByProposalId, refetchPlannerWorkItems],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const command = input.trim();
    if (!command || isProcessing) return;

    setIsProcessing(true);
    setActiveTab("command");
    setResponse(null);

    window.setTimeout(() => {
      const result = resolveChiefCommand(command, data, liveContext, approvals);
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
            Command layer
            {loading
              ? " · loading context"
              : source === "mock"
                ? " · mock context"
                : ` · ${formatDataSourceLabel(source)}`}
          </span>
        </div>
      </div>

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
          {awaitingApprovalCount > 0 ? (
            <span className="chief-tab-badge" aria-label={`${awaitingApprovalCount} awaiting approval`}>
              {awaitingApprovalCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id="chief-tab-timeline"
          aria-selected={activeTab === "timeline"}
          aria-controls="chief-panel-timeline"
          className={`chief-tab${activeTab === "timeline" ? " chief-tab--active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Timeline
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
        {SHOW_GOVERNANCE_TAB ? (
          <button
            type="button"
            role="tab"
            id="chief-tab-governance"
            aria-selected={activeTab === "governance"}
            aria-controls="chief-panel-governance"
            className={`chief-tab${activeTab === "governance" ? " chief-tab--active" : ""}`}
            onClick={() => setActiveTab("governance")}
          >
            Governance
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
              pendingUrgency={pendingUrgency}
              onOpenApprovals={() => openApprovals({ filter: "pending" })}
              platformHealth={platformHealth}
              liveApiEnabled={liveApi}
            />

            {!response && !isProcessing ? (
              <div className="chief-empty">
                <p className="chief-empty-lead">Ask Chief</p>
                <p className="chief-empty-desc">
                  Summarize status, check gates, or route to a specialist. Responses are
                  advisory—nothing executes without your approval.
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
                  Routing command…
                </div>
                <div className="chief-processing-lines" aria-hidden="true">
                  <span className="chief-skeleton-line chief-skeleton-line--long" />
                  <span className="chief-skeleton-line chief-skeleton-line--medium" />
                  <span className="chief-skeleton-line chief-skeleton-line--short" />
                </div>
              </div>
            ) : null}

            {response && !isProcessing ? (
              <article className="chief-response-card">
                <div className="chief-response-section chief-response-section--chief">
                  <div className="chief-speaker-row">
                    <h3 className="chief-response-label">Chief</h3>
                    <span className="chief-speaker-badge">Response</span>
                  </div>
                  <p className="chief-response-text">{response.summary}</p>
                </div>

                {response.blockers && response.blockers.length > 0 ? (
                  <div className="chief-response-section">
                    <h3 className="chief-response-label">Blockers</h3>
                    <ul className="chief-blocker-list">
                      {response.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="chief-response-section">
                  <h3 className="chief-response-label">Recommended action</h3>
                  <p className="chief-response-text chief-response-text--action">
                    {response.recommendedAction}
                  </p>
                </div>

                {response.approvalNeeded ? (
                  <div className="chief-response-section chief-approval">
                    <div className="chief-approval-header">
                      <h3 className="chief-response-label">Approval needed</h3>
                      <span className="chief-approval-badge">Required</span>
                    </div>
                    <p className="chief-response-text chief-approval-prompt">
                      {response.approvalPrompt ?? "This action requires your confirmation."}
                    </p>
                    {response.riskNote ? (
                      <p className="chief-approval-risk">{response.riskNote}</p>
                    ) : null}
                    <button
                      type="button"
                      className="chief-approval-link"
                      onClick={() => openApprovals()}
                    >
                      Open Approvals to review and decide
                    </button>
                  </div>
                ) : null}

                {response.specialists && response.specialists.length > 0 ? (
                  <SpecialistCards specialists={response.specialists} />
                ) : null}
              </article>
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
              onOpenApprovals={() => openApprovals({ filter: "pending" })}
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

        {activeTab === "timeline" ? (
          <div
            id="chief-panel-timeline"
            role="tabpanel"
            aria-labelledby="chief-tab-timeline"
            className="chief-tab-panel"
          >
            <AgentActivityTimeline />
          </div>
        ) : null}

        {activeTab === "approvals" ? (
          <div
            id="chief-panel-approvals"
            role="tabpanel"
            aria-labelledby="chief-tab-approvals"
            className="chief-tab-panel"
          >
            {decisionsHydrationError ? (
              <p className="chief-approval-note" role="alert">
                Couldn&apos;t refresh saved decisions from the server ({decisionsHydrationError}).
                This list may not reflect the latest server state.
              </p>
            ) : null}
            <ApprovalBoard
              proposals={approvals}
              approvalActionStates={approvalActionStates}
              onApprovalAction={handleApprovalAction}
              statusFilter={approvalStatusFilter}
              onStatusFilterChange={setApprovalStatusFilter}
              focusProposalId={focusProposalId}
              onOpenAgents={openAgents}
              liveApi={liveApi}
              librarianWorkByProposalId={librarianWorkByProposalId}
              filingProposalId={filingProposalId}
              onFileDecisionToVault={handleFileDecisionToVault}
              maintenanceWorkByProposalId={maintenanceWorkByProposalId}
              filingMaintenanceProposalId={filingMaintenanceProposalId}
              onFileMaintenanceTask={handleFileMaintenanceTask}
              plannerWorkByProposalId={plannerWorkByProposalId}
              filingPlannerProposalId={filingPlannerProposalId}
              onFileDecisionToPlanner={handleFileDecisionToPlanner}
            />
            {fileVaultFeedback ? (
              <p className="chief-approval-note" role="status">
                {fileVaultFeedback}
              </p>
            ) : null}
            {fileMaintenanceFeedback ? (
              <p className="chief-approval-note" role="status">
                {fileMaintenanceFeedback}
              </p>
            ) : null}
            {filePlannerFeedback ? (
              <p className="chief-approval-note" role="status">
                {filePlannerFeedback}
              </p>
            ) : null}
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

        {SHOW_GOVERNANCE_TAB && activeTab === "governance" ? (
          <div
            id="chief-panel-governance"
            role="tabpanel"
            aria-labelledby="chief-tab-governance"
            className="chief-tab-panel"
          >
            <GovernanceEventsPanel />
            <ChiefApprovalAuditPanel />
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
