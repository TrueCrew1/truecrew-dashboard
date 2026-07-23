import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "@/components/ui";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import {
  deriveChiefBoardItems,
  deriveResearchAgentWorkItems,
  resolveChiefCommand,
} from "./chiefLiveContext";
import { CHIEF_ROUTES } from "./chiefRoutes";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { ChiefContextSwitcher } from "./ChiefContextSwitcher";
import { chiefContextScopeSummary } from "./chiefContext";
import { useChiefContext } from "@/context/ChiefContextProvider";
import { ChiefApprovalConflictError, isLiveApiEnabled } from "@/lib/api/client";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { useBuildTasks, type BuildGateTask } from "./hooks/useBuildTasks";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import { ChiefOperationalStatusPanel } from "./ChiefOperationalStatusPanel";
import { ChiefDailyTurnoverPanel } from "./ChiefDailyTurnoverPanel";
import { AgentStatusStrip } from "./AgentStatusStrip";
import { ChiefReplyBlock } from "./ChiefReplyBlock";
import { ChiefApprovalActions } from "./ChiefApprovalActions";
import {
  matchChiefProjectToolIntent,
  runChiefProjectToolRead,
} from "./chiefProjectToolReads";
import { approvalActionSuccessMessage, type ApprovalActionState } from "./chiefApproval";
import { runApprovedProjectToolDraftMutation } from "./runApprovedProjectToolDraftMutation";
import {
  getProjectToolMutationAudit,
  mutationOutcomeToActionPhase,
} from "./chiefProjectToolMutation";
import { deriveApprovalExecutionFeedback } from "./approvalExecutionFeedback";
import { runResearchAssignmentDispatch } from "./researchAssignmentDispatch";
import { matchResearchAssignmentIntent } from "@/lib/chief/researchAssignment";
import {
  buildResearchAssignmentGlobalRefusal,
  buildResearchAssignmentResponse,
} from "./chiefResearchAssignment";
import { useResearchAssignments } from "./ChiefResearchAssignmentBlock";
import { formatResearchAssignmentBoardLine } from "./researchAssignmentView";
import type {
  AgentWorkItem,
  ApprovalAction,
  ApprovalProposal,
  ChiefBoardItem,
  ChiefResponse,
} from "./types";
import {
  GITHUB_PR_COMMENT_DRAFT_KIND,
  OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
  RESEARCH_ASSIGNMENT_DISPATCH_KIND,
} from "./types";

const SNAPSHOT_LIMIT = 4;

interface LaneSummary {
  status: string;
  detail: string;
  tone: "neutral" | "warn" | "critical";
  count: number;
}

function buildChiefLaneSummary(
  pendingApprovals: ApprovalProposal[],
  blockedItems: ChiefBoardItem[],
): LaneSummary {
  const approvalCount = pendingApprovals.length;
  const blockedCount = blockedItems.length;
  const status =
    approvalCount === 0 && blockedCount === 0
      ? "Queue clear · no blockers"
      : [
          approvalCount > 0 ? `${approvalCount} approval${approvalCount === 1 ? "" : "s"}` : null,
          blockedCount > 0 ? `${blockedCount} blocker${blockedCount === 1 ? "" : "s"}` : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" · ");
  return {
    status,
    detail:
      pendingApprovals[0]?.title ?? blockedItems[0]?.title ?? "All caught up — nothing waiting on you.",
    tone: approvalCount > 0 ? "critical" : blockedCount > 0 ? "warn" : "neutral",
    count: approvalCount + blockedCount,
  };
}

function buildRepoLaneSummary(buildGateTasks: BuildGateTask[]): LaneSummary {
  if (buildGateTasks.length === 0) {
    return {
      status: "Repo queue clear",
      detail: "No repo tasks are waiting on required gates.",
      tone: "neutral",
      count: 0,
    };
  }
  const hasCritical = buildGateTasks.some((task) => task.tone === "critical");
  const top = buildGateTasks[0];
  const detail =
    buildGateTasks.length > 1 ? `${top.title} +${buildGateTasks.length - 1} more` : top.title;
  return {
    status: hasCritical ? "Gate overdue" : "Gated repo work",
    detail,
    tone: hasCritical ? "critical" : "warn",
    count: buildGateTasks.length,
  };
}

function buildResearchLaneSummary(
  activeResearchItems: AgentWorkItem[],
  researchApprovals: ApprovalProposal[],
): LaneSummary {
  const total = activeResearchItems.length + researchApprovals.length;
  const topLabel = activeResearchItems[0]?.task ?? researchApprovals[0]?.title;
  return {
    status: total === 0 ? "No active research" : "Research active",
    detail: topLabel
      ? total > 1
        ? `${topLabel} +${total - 1} more`
        : topLabel
      : "No active incidents or research proposals right now.",
    tone: total === 0 ? "neutral" : "warn",
    count: total,
  };
}

export function ChiefHomePanel() {
  const approvalSnapshotRef = useRef<HTMLDivElement>(null);
  const { activeContextDefinition, activeToolScope } = useChiefContext();

  // Shared with the sidebar Chief panel (ChiefApprovalsContext) — same
  // merged, decision-applied queue, so counts here stay in sync with the
  // sidebar within the same session instead of only matching at load.
  const { chiefData, liveContext, approvals, addCommandApproval, addHistoryEntry, recordDecision } =
    useChiefApprovals();

  // Re-render when research assignment store changes so board lines / feedback stay live.
  useResearchAssignments();

  const pendingApprovals = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending"),
    [approvals],
  );

  const proposalsById = useMemo(
    () => new Map(approvals.map((proposal) => [proposal.id, proposal])),
    [approvals],
  );

  /** Prefer draft cards (Obsidian / GitHub) so approve → write/post is reachable. */
  const homeApprovalSnapshot = useMemo(() => {
    const isDraft = (proposal: ApprovalProposal) =>
      proposal.missionKind === OBSIDIAN_PROJECT_NOTE_DRAFT_KIND ||
      proposal.missionKind === GITHUB_PR_COMMENT_DRAFT_KIND ||
      proposal.missionKind === RESEARCH_ASSIGNMENT_DISPATCH_KIND;
    const drafts = pendingApprovals.filter(isDraft);
    const others = pendingApprovals.filter((proposal) => !isDraft(proposal));
    return [...drafts, ...others].slice(0, SNAPSHOT_LIMIT);
  }, [pendingApprovals]);

  const [approvalActionStates, setApprovalActionStates] = useState<
    Record<string, ApprovalActionState>
  >({});
  const [responseApprovalId, setResponseApprovalId] = useState<string | null>(null);

  const boardItems = useMemo(
    () => deriveChiefBoardItems(liveContext, approvals),
    [liveContext, approvals],
  );

  // Task blockers only, matching the Situation Brief's "Blocked" count
  // (context.blockingTasks.length) — the Board tab's "blocked" lane also
  // folds in held deploys, which would make this snapshot disagree with
  // the brief directly above it.
  const blockedItems = useMemo(
    () =>
      boardItems.filter(
        (item) => item.lane === "blocked" && item.id.startsWith("board-blocked-task-"),
      ),
    [boardItems],
  );

  const { buildGateTasks } = useBuildTasks();
  const liveApi = isLiveApiEnabled();
  const platformHealth = useMonitorHealth();

  const researchWorkItems = useMemo(
    () => deriveResearchAgentWorkItems(liveContext.activeIncidents),
    [liveContext.activeIncidents],
  );
  const activeResearchItems = useMemo(
    () => researchWorkItems.filter((item) => item.status === "active"),
    [researchWorkItems],
  );
  const researchApprovals = useMemo(
    () => pendingApprovals.filter((proposal) => proposal.specialist === "Research Agent"),
    [pendingApprovals],
  );

  const chiefLane = useMemo(
    () => buildChiefLaneSummary(pendingApprovals, blockedItems),
    [pendingApprovals, blockedItems],
  );
  const repoLane = useMemo(() => buildRepoLaneSummary(buildGateTasks), [buildGateTasks]);
  const researchLane = useMemo(
    () => buildResearchLaneSummary(activeResearchItems, researchApprovals),
    [activeResearchItems, researchApprovals],
  );

  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprovalAction = useCallback(
    async (id: string, action: ApprovalAction) => {
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

        if (action === "approved") {
          const draftMutation = await runApprovedProjectToolDraftMutation({
            proposal,
            liveApi,
          });
          if (draftMutation.handled) {
            setApprovalActionStates((prev) => ({
              ...prev,
              [id]: {
                phase: mutationOutcomeToActionPhase(draftMutation),
                action,
                message: draftMutation.message,
              },
            }));
            return;
          }

          const researchDispatch = runResearchAssignmentDispatch({ proposal });
          if (researchDispatch.handled) {
            setApprovalActionStates((prev) => ({
              ...prev,
              [id]: {
                phase: researchDispatch.ok ? "success" : "error",
                action,
                message: researchDispatch.message,
              },
            }));
            return;
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
    [proposalsById, recordDecision, liveApi],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    void (async () => {
      const toolIntent = matchChiefProjectToolIntent(trimmed);
      let result: ChiefResponse;
      if (matchResearchAssignmentIntent(trimmed)) {
        result = activeToolScope
          ? buildResearchAssignmentResponse({ scope: activeToolScope, command: trimmed })
          : buildResearchAssignmentGlobalRefusal();
      } else if (toolIntent) {
        result = await runChiefProjectToolRead(toolIntent, activeToolScope, trimmed);
      } else {
        result = resolveChiefCommand(trimmed, chiefData, liveContext, approvals);
      }
      setResponse(result);
      addHistoryEntry(buildHistoryEntry(trimmed, result));

      const newApproval = buildApprovalFromResponse(trimmed, result);
      if (newApproval) {
        addCommandApproval(newApproval);
        setResponseApprovalId(newApproval.id);
      } else {
        setResponseApprovalId(null);
      }

      setIsProcessing(false);
    })();
  };

  const responseApproval = responseApprovalId
    ? proposalsById.get(responseApprovalId) ?? null
    : null;

  return (
    <Panel title="Chief" action={<ChiefContextSwitcher />}>
      <div className="chief-home-panel">
        <p
          className={`chief-home-context-banner chief-home-context-banner--${activeContextDefinition.kind}`}
          role="status"
        >
          {activeContextDefinition.kind === "project" ? (
            <>
              Operating inside <strong>{activeContextDefinition.label}</strong>.{" "}
              {chiefContextScopeSummary(activeContextDefinition)}
            </>
          ) : (
            <>
              <strong>Global</strong>. {chiefContextScopeSummary(activeContextDefinition)}
            </>
          )}
        </p>

        <ChiefSituationBrief
          context={liveContext}
          pendingApprovalCount={pendingApprovals.length}
          onOpenApprovals={() =>
            approvalSnapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          platformHealth={platformHealth}
          liveApiEnabled={liveApi}
        />

        <ChiefOperationalStatusPanel />

        <ChiefDailyTurnoverPanel />

        <AgentStatusStrip />

        <div className="chief-home-lanes">
          <div className={`chief-home-lane chief-home-lane--${chiefLane.tone}`}>
            <header className="chief-home-lane-header">
              <span className="chief-home-lane-name">Chief</span>
              <span className="chief-board-lane-count">{chiefLane.count}</span>
            </header>
            <p className="chief-home-lane-status">{chiefLane.status}</p>
            <p className="chief-home-lane-detail">{chiefLane.detail}</p>
            <button
              type="button"
              className="chief-home-lane-link chief-board-lane-note--link"
              onClick={() =>
                approvalSnapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Review approvals →
            </button>
          </div>

          <div className={`chief-home-lane chief-home-lane--${repoLane.tone}`}>
            <header className="chief-home-lane-header">
              <span className="chief-home-lane-name">Repo</span>
              <span className="chief-board-lane-count">{repoLane.count}</span>
            </header>
            <p className="chief-home-lane-status">{repoLane.status}</p>
            <p className="chief-home-lane-detail">{repoLane.detail}</p>
            <Link to={CHIEF_ROUTES.builds} className="chief-home-lane-link">
              Open Builds →
            </Link>
          </div>

          <div className={`chief-home-lane chief-home-lane--${researchLane.tone}`}>
            <header className="chief-home-lane-header">
              <span className="chief-home-lane-name">Research</span>
              <span className="chief-board-lane-count">{researchLane.count}</span>
            </header>
            <p className="chief-home-lane-status">{researchLane.status}</p>
            <p className="chief-home-lane-detail">{researchLane.detail}</p>
            <Link to={CHIEF_ROUTES.knowledge} className="chief-home-lane-link">
              Open Knowledge →
            </Link>
          </div>
        </div>

        <form className="chief-home-intake" onSubmit={handleSubmit}>
          <label className="chief-home-intake-label" htmlFor="chief-home-command">
            Ask Chief
          </label>
          <div className="chief-home-intake-row">
            <input
              id="chief-home-command"
              type="text"
              className="chief-home-intake-input"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="e.g. What is at risk today?"
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="chief-home-intake-submit"
              disabled={!command.trim() || isProcessing}
            >
              {isProcessing ? "Running…" : "Run"}
            </button>
          </div>

          {response ? (
            <div className="chief-home-response">
              <ChiefReplyBlock
                response={response}
                variant="home"
                approvalStatus={responseApproval?.status}
                mutationAudit={
                  responseApproval ? getProjectToolMutationAudit(responseApproval.id) : null
                }
              />
              {responseApproval ? (
                <div className="chief-home-response-approval">
                  <ChiefApprovalActions
                    proposal={responseApproval}
                    actionState={approvalActionStates[responseApproval.id]}
                    executionFeedback={deriveApprovalExecutionFeedback({
                      proposal: responseApproval,
                      liveApiEnabled: liveApi,
                      isLaunching:
                        approvalActionStates[responseApproval.id]?.phase === "loading" &&
                        approvalActionStates[responseApproval.id]?.action === "approved",
                    })}
                    onAction={handleApprovalAction}
                    variant="card"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="chief-home-snapshots">
          <div className="chief-home-snapshot" ref={approvalSnapshotRef}>
            <header className="chief-home-snapshot-header">
              <h3 className="chief-home-snapshot-title">Needs approval</h3>
              <span className="chief-board-lane-count">{pendingApprovals.length}</span>
            </header>
            {pendingApprovals.length === 0 ? (
              <p className="agent-work-lane-empty">No pending proposals — queue is clear.</p>
            ) : (
              <ul className="chief-board-list">
                {homeApprovalSnapshot.map((proposal) => (
                  <li key={proposal.id}>
                    <div className="chief-board-card chief-board-card--critical">
                      <div className="chief-board-card-header">
                        <span className="chief-board-card-title">{proposal.title}</span>
                      </div>
                      <p className="chief-board-card-detail">{proposal.summary}</p>
                      {proposal.obsidianNoteDraft ? (
                        <p className="chief-home-draft-path">
                          Target: {proposal.obsidianNoteDraft.targetPath}
                        </p>
                      ) : null}
                      {proposal.githubPrCommentDraft ? (
                        <p className="chief-home-draft-path">
                          Target: {proposal.githubPrCommentDraft.repo}#
                          {proposal.githubPrCommentDraft.prNumber}
                        </p>
                      ) : null}
                      {proposal.researchAssignment ? (
                        <p className="chief-home-draft-path">
                          {formatResearchAssignmentBoardLine(proposal.researchAssignment)}
                        </p>
                      ) : null}
                      <ChiefApprovalActions
                        proposal={proposal}
                        actionState={approvalActionStates[proposal.id]}
                        executionFeedback={deriveApprovalExecutionFeedback({
                          proposal,
                          liveApiEnabled: liveApi,
                          isLaunching:
                            approvalActionStates[proposal.id]?.phase === "loading" &&
                            approvalActionStates[proposal.id]?.action === "approved",
                        })}
                        onAction={handleApprovalAction}
                        variant="board"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pendingApprovals.length > SNAPSHOT_LIMIT ? (
              <p className="chief-board-lane-note">
                Showing {SNAPSHOT_LIMIT} of {pendingApprovals.length} — review the rest in the
                Chief panel&apos;s Approvals tab.
              </p>
            ) : null}
          </div>

          <div className="chief-home-snapshot">
            <header className="chief-home-snapshot-header">
              <h3 className="chief-home-snapshot-title">Blocked</h3>
              <span className="chief-board-lane-count">{blockedItems.length}</span>
            </header>
            {blockedItems.length === 0 ? (
              <p className="agent-work-lane-empty">No open gates or held deploys.</p>
            ) : (
              <ul className="chief-board-list">
                {blockedItems.slice(0, SNAPSHOT_LIMIT).map((item) => (
                  <li key={item.id}>
                    <div className={`chief-board-card chief-board-card--${item.tone}`}>
                      <div className="chief-board-card-header">
                        <span className="chief-board-card-title">{item.title}</span>
                        {item.meta ? <span className="chief-board-card-meta">{item.meta}</span> : null}
                      </div>
                      <p className="chief-board-card-detail">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {blockedItems.length > SNAPSHOT_LIMIT ? (
              <p className="chief-board-lane-note">
                Showing {SNAPSHOT_LIMIT} of {blockedItems.length} — see Builds or Review for the
                rest.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}
