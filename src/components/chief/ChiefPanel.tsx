import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import {
  ChiefApprovalConflictError,
  fetchChiefApprovalDecisions,
  formatDataSourceLabel,
  isLiveApiEnabled,
  recordChiefApprovalDecision,
} from "@/lib/api/client";
import { ApprovalBoard } from "./ApprovalBoard";
import { CommandHistory } from "./CommandHistory";
import {
  buildApprovalFromResponse,
  buildHistoryEntry,
} from "./chiefMock";
import {
  APPROVAL_ACTION_DELAY_MS,
  approvalActionSuccessMessage,
  approvalActionToStatus,
  type ApprovalActionState,
} from "./chiefApproval";
import {
  buildChiefLiveContext,
  deriveApprovalCandidates,
  deriveChiefBoardItems,
  resolveChiefCommand,
} from "./chiefLiveContext";
import { SpecialistCards } from "./SpecialistCards";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import { ChiefBoard } from "./ChiefBoard";
import type {
  ApprovalAction,
  ApprovalDecision,
  ApprovalProposal,
  ChiefResponse,
  CommandHistoryEntry,
} from "./types";
import type { ApprovalStatusFilter } from "./approvalStatus";

const EXAMPLE_COMMANDS = [
  "What is at risk today?",
  "What's blocked?",
  "Show approvals I need to review",
  "What tasks are missing customer context?",
  "Show open alerts",
];

type ChiefTab = "command" | "board" | "approvals" | "history";

export function ChiefPanel() {
  const { data, loading, source } = useData();
  const liveContext = useMemo(() => buildChiefLiveContext(data), [data]);
  const derivedApprovals = useMemo(
    () => deriveApprovalCandidates(data, liveContext),
    [data, liveContext],
  );

  const [activeTab, setActiveTab] = useState<ChiefTab>("command");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandApprovals, setCommandApprovals] = useState<ApprovalProposal[]>([]);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, ApprovalDecision>>(
    {},
  );
  const [approvalActionStates, setApprovalActionStates] = useState<
    Record<string, ApprovalActionState>
  >({});
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ApprovalStatusFilter>("all");

  const openApprovals = useCallback((filter: ApprovalStatusFilter = "all") => {
    setApprovalStatusFilter(filter);
    setActiveTab("approvals");
  }, []);

  const liveApi = isLiveApiEnabled();
  const [decisionsHydrated, setDecisionsHydrated] = useState(!liveApi);

  useEffect(() => {
    if (!liveApi) return;

    let cancelled = false;
    setDecisionsHydrated(false);

    fetchChiefApprovalDecisions()
      .then((decisions) => {
        if (cancelled) return;
        setApprovalDecisions(
          Object.fromEntries(
            decisions.map((decision) => [
              decision.proposalId,
              {
                proposalId: decision.proposalId,
                status: decision.status,
                decidedAt: decision.decidedAt,
                actor: decision.actor,
              },
            ]),
          ),
        );
      })
      .catch(() => {
        // Leave previously hydrated/optimistic decisions in place — a failed
        // refetch shouldn't erase decisions the operator already recorded.
      })
      .finally(() => {
        if (!cancelled) setDecisionsHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [liveApi, source]);

  const applyDecision = useCallback((decision: ApprovalDecision) => {
    setApprovalDecisions((prev) => ({ ...prev, [decision.proposalId]: decision }));
  }, []);

  const approvals = useMemo(() => {
    const byId = new Map<string, ApprovalProposal>();
    for (const proposal of [...derivedApprovals, ...commandApprovals]) {
      byId.set(proposal.id, proposal);
    }
    return [...byId.values()].map((proposal) => {
      const decision = approvalDecisions[proposal.id];
      if (!decision) return proposal;
      return {
        ...proposal,
        status: decision.status,
        decidedAt: decision.decidedAt,
        decidedBy: decision.actor ?? undefined,
      };
    });
  }, [derivedApprovals, commandApprovals, approvalDecisions]);

  const pendingApprovalCount = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending").length,
    [approvals],
  );

  const boardItems = useMemo(
    () => deriveChiefBoardItems(liveContext, approvals),
    [liveContext, approvals],
  );

  const proposalsById = useMemo(
    () => new Map(approvals.map((proposal) => [proposal.id, proposal])),
    [approvals],
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
        const nextStatus = approvalActionToStatus(action);

        if (liveApi) {
          const decision = await recordChiefApprovalDecision(id, nextStatus);
          applyDecision({
            proposalId: decision.proposalId,
            status: decision.status,
            decidedAt: decision.decidedAt,
            actor: decision.actor,
          });
        } else {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, APPROVAL_ACTION_DELAY_MS);
          });
          applyDecision({
            proposalId: id,
            status: nextStatus,
            decidedAt: new Date().toISOString(),
            actor: null,
          });
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
          applyDecision({
            proposalId: error.decision.proposalId,
            status: error.decision.status,
            decidedAt: error.decision.decidedAt,
            actor: error.decision.actor,
          });
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
    [proposalsById, liveApi, applyDecision, decisionsHydrated],
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
      setHistory((prev) => [buildHistoryEntry(command, result), ...prev]);

      const newApproval = buildApprovalFromResponse(command, result);
      if (newApproval) {
        setCommandApprovals((prev) => [
          newApproval,
          ...prev.filter((proposal) => proposal.id !== newApproval.id),
        ]);
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
              onOpenApprovals={() => openApprovals("pending")}
            />
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
