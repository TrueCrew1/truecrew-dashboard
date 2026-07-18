import { FormEvent, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import {
  deriveChiefBoardItems,
  deriveResearchAgentWorkItems,
  resolveChiefCommand,
} from "./chiefLiveContext";
import { CHIEF_ROUTES } from "./chiefRoutes";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { useBuildTasks, type BuildGateTask } from "./hooks/useBuildTasks";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import type { AgentWorkItem, ApprovalProposal, ChiefBoardItem, ChiefResponse } from "./types";

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

function buildBuilderLaneSummary(buildGateTasks: BuildGateTask[]): LaneSummary {
  if (buildGateTasks.length === 0) {
    return {
      status: "Build queue clear",
      detail: "No build tasks are waiting on required gates.",
      tone: "neutral",
      count: 0,
    };
  }
  const hasCritical = buildGateTasks.some((task) => task.tone === "critical");
  const top = buildGateTasks[0];
  const detail =
    buildGateTasks.length > 1 ? `${top.title} +${buildGateTasks.length - 1} more` : top.title;
  return {
    status: hasCritical ? "Gate overdue" : "Gated build work",
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
  const { data } = useData();
  const approvalSnapshotRef = useRef<HTMLDivElement>(null);

  // Shared with the sidebar Chief panel (ChiefApprovalsContext) — same
  // merged, decision-applied queue, so counts here stay in sync with the
  // sidebar within the same session instead of only matching at load.
  const { liveContext, approvals, addCommandApproval, addHistoryEntry } = useChiefApprovals();

  const pendingApprovals = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending"),
    [approvals],
  );

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
  const builderLane = useMemo(() => buildBuilderLaneSummary(buildGateTasks), [buildGateTasks]);
  const researchLane = useMemo(
    () => buildResearchLaneSummary(activeResearchItems, researchApprovals),
    [activeResearchItems, researchApprovals],
  );

  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    window.setTimeout(() => {
      const result = resolveChiefCommand(trimmed, data, liveContext, approvals);
      setResponse(result);
      addHistoryEntry(buildHistoryEntry(trimmed, result));

      const newApproval = buildApprovalFromResponse(trimmed, result);
      if (newApproval) {
        addCommandApproval(newApproval);
      }

      setIsProcessing(false);
    }, 320);
  };

  return (
    <Panel title="Chief">
      <div className="chief-home-panel">
        <ChiefSituationBrief
          context={liveContext}
          pendingApprovalCount={pendingApprovals.length}
          onOpenApprovals={() =>
            approvalSnapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />

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

          <div className={`chief-home-lane chief-home-lane--${builderLane.tone}`}>
            <header className="chief-home-lane-header">
              <span className="chief-home-lane-name">Builder</span>
              <span className="chief-board-lane-count">{builderLane.count}</span>
            </header>
            <p className="chief-home-lane-status">{builderLane.status}</p>
            <p className="chief-home-lane-detail">{builderLane.detail}</p>
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
            <div className="chief-home-response" aria-live="polite">
              <p className="chief-home-response-summary">{response.summary}</p>
              <p className="chief-home-response-action">
                <span className="chief-home-response-label">Recommended:</span>{" "}
                {response.recommendedAction}
              </p>
              {response.approvalNeeded ? (
                <p className="chief-home-response-approval">
                  Needs approval — filed to the Chief panel's Approvals tab for review.
                </p>
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
                {pendingApprovals.slice(0, SNAPSHOT_LIMIT).map((proposal) => (
                  <li key={proposal.id}>
                    <div className="chief-board-card chief-board-card--critical">
                      <div className="chief-board-card-header">
                        <span className="chief-board-card-title">{proposal.title}</span>
                      </div>
                      <p className="chief-board-card-detail">{proposal.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pendingApprovals.length > SNAPSHOT_LIMIT ? (
              <p className="chief-board-lane-note">
                Showing {SNAPSHOT_LIMIT} of {pendingApprovals.length} — review the rest in the
                Chief panel's Approvals tab.
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
