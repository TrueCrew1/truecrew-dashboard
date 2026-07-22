import { FormEvent, useMemo, useRef, useState } from "react";
import { Panel } from "@/components/ui";
import { useData } from "@/context/DataContext";
import {
  askChiefAiFallback,
  isChiefAiFallbackEnabled,
  isChiefLocalOnlyModeDefault,
  isLiveApiEnabled,
} from "@/lib/api/client";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { useBuildTasks } from "./hooks/useBuildTasks";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import { deriveChiefBoardItems } from "./chiefApprovalBoard";
import { compareApprovalsByAge } from "./chiefApprovalUrgency";
import { buildChiefContextSummary, resolveChiefCommand } from "./chiefCommandRouter";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import { ApprovalActivityCard } from "./ApprovalActivityCard";
// Task-time research state comes only from the sanctioned @/lib/knowledge
// barrel — never from latestResearchSource or taskTimeResearch directly. See
// docs/AGENT_RUNBOOK.md § Knowledge Precedence & Task-Time Retrieval.
import { getRecentResearchActivity } from "@/lib/knowledge/index";
import type { ChiefResponse } from "./types";

const SNAPSHOT_LIMIT = 4;

type LaneTone = "green" | "yellow" | "red" | "steel";

interface LaneStatus {
  state: string;
  tone: LaneTone;
  detail: string;
}

// Build-time read of knowledge/sources/ (see @/lib/knowledge/index) and the
// static manual queue (see requests.ts) — same module-level caching
// AgentWorkBoard already uses for these calls; neither changes per render.
const RECENT_RESEARCH_ACTIVITY = getRecentResearchActivity();
const HAS_FILED_RESEARCH = RECENT_RESEARCH_ACTIVITY !== null;

export function ChiefHomePanel() {
  const { data } = useData();
  const { allRequests: researchRequests } = useResearchRequests();
  const approvalSnapshotRef = useRef<HTMLDivElement>(null);

  // Shared with the sidebar Chief panel (ChiefApprovalsContext) — same
  // merged, decision-applied queue, so counts here stay in sync with the
  // sidebar within the same session instead of only matching at load.
  const { liveContext, approvals, addCommandApproval, addHistoryEntry } = useChiefApprovals();
  const liveApi = isLiveApiEnabled();
  // Same hook and endpoints Monitor already uses — no new polling or data source.
  const platformHealth = useMonitorHealth();

  const pendingApprovals = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending"),
    [approvals],
  );

  // Oldest pending approval first — same stale-first derivation ChiefQueueStrip
  // uses for its "Current" field, so this header agrees with the Chief panel
  // instead of inventing a second notion of "current task."
  const currentTask = useMemo(() => {
    const pending = approvals.filter((proposal) => proposal.status === "pending");
    pending.sort(compareApprovalsByAge);
    return pending[0] ?? null;
  }, [approvals]);

  // Same live task/gate signal ChiefBoard's Build gates lane and the Agents
  // tab's Work Story panels already use (useBuildTasks) — no separate
  // Builder-status source invented here.
  const { buildGateTasks, isLoading: buildGateTasksLoading } = useBuildTasks();

  const chiefLane: LaneStatus = useMemo(() => {
    const pending = pendingApprovals.length;
    const blocked = liveContext.blockingTasks.length;
    return {
      state: pending > 0 ? "Awaiting decisions" : blocked > 0 ? "Monitoring blockers" : "Clear",
      tone: pending > 0 ? "red" : blocked > 0 ? "yellow" : "green",
      detail: `${pending} pending approval${pending === 1 ? "" : "s"} · ${blocked} blocked`,
    };
  }, [pendingApprovals.length, liveContext.blockingTasks.length]);

  const builderLane: LaneStatus = useMemo(() => {
    if (buildGateTasksLoading) {
      return { state: "Loading…", tone: "steel", detail: "Checking build gate data…" };
    }
    if (buildGateTasks.length === 0) {
      return { state: "Queue empty", tone: "steel", detail: "No build tasks awaiting required gates." };
    }
    const hasOverdue = buildGateTasks.some((task) => task.tone === "critical");
    const top = buildGateTasks[0];
    return {
      state: hasOverdue ? "Gate overdue" : "Awaiting gates",
      tone: hasOverdue ? "red" : "yellow",
      detail: `${buildGateTasks.length} task${buildGateTasks.length === 1 ? "" : "s"} · ${top.title}`,
    };
  }, [buildGateTasks, buildGateTasksLoading]);

  // Same real signal AgentWorkBoard's Research lane uses (manual request
  // queue + filed knowledge/sources/ notes) — no invented "live" status.
  // Gate-aware, not just "any note filed" — a filed-but-Provisional (or
  // unmapped) note must not read as the same "Active"/green claim as a real
  // Verified/Cited one. See docs/AGENT_RUNBOOK.md § Knowledge Precedence &
  // Task-Time Retrieval and src/lib/knowledge/taskTimeResearch.ts.
  const researchLane: LaneStatus = useMemo(() => {
    if (researchRequests.length === 0 && !HAS_FILED_RESEARCH) {
      return {
        state: "Awaiting live work feed",
        tone: "steel",
        detail: "No research requests queued or notes filed yet.",
      };
    }
    if (RECENT_RESEARCH_ACTIVITY) {
      // Honestly labeled via the note's own verification (getRecentResearchActivity,
      // @/lib/knowledge/index) — a Provisional note never reads with the same
      // green "Active" tone as a real Verified/Cited one.
      return {
        state: RECENT_RESEARCH_ACTIVITY.badgeTone === "green" ? "Active" : "Provisional only",
        tone: RECENT_RESEARCH_ACTIVITY.badgeTone,
        detail: `Latest: ${RECENT_RESEARCH_ACTIVITY.title} — ${RECENT_RESEARCH_ACTIVITY.badgeLabel} (${RECENT_RESEARCH_ACTIVITY.createdDate})`,
      };
    }
    return {
      state: "Active",
      tone: "green",
      detail: `${researchRequests.length} request${researchRequests.length === 1 ? "" : "s"} queued`,
    };
  }, [researchRequests.length]);

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

  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [preferLocalOnly, setPreferLocalOnly] = useState(isChiefLocalOnlyModeDefault);
  // Guards against a stale AI fallback response landing after a newer
  // command has already been submitted.
  const enhanceRequestIdRef = useRef(0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    // resolveChiefCommand is synchronous (regex/keyword dispatch against
    // already-loaded live context, no I/O) — no artificial delay needed.
    const result = resolveChiefCommand(trimmed, data, liveContext, approvals);
    setResponse(result);
    addHistoryEntry(buildHistoryEntry(trimmed, result));

    const newApproval = buildApprovalFromResponse(trimmed, result);
    if (newApproval) {
      addCommandApproval(newApproval);
    }

    setIsProcessing(false);

    // No specialist matched — optionally ask the Azure AI fallback for a
    // better answer than the canned DEFAULT_RESPONSE. Off by default
    // (VITE_CHIEF_AI_FALLBACK_ENABLED); silently keeps the deterministic
    // response on any failure or if a newer command supersedes this one.
    if (result.isGenericFallback && isChiefAiFallbackEnabled()) {
      const requestId = ++enhanceRequestIdRef.current;
      setIsEnhancing(true);
      askChiefAiFallback(trimmed, buildChiefContextSummary(liveContext), preferLocalOnly)
        .then((fallback) => {
          if (enhanceRequestIdRef.current !== requestId) return;
          setIsEnhancing(false);
          if (!fallback) return;
          setResponse((prev) =>
            prev && prev.isGenericFallback ? { ...prev, summary: fallback.summary } : prev,
          );
        })
        .catch(() => {
          if (enhanceRequestIdRef.current === requestId) setIsEnhancing(false);
        });
    }
  };

  return (
    <Panel title="Chief">
      <div className="chief-home-panel">
        <header className="chief-home-priority-header">
          <div className="chief-home-priority-item">
            <span className="chief-home-priority-label">Priority served</span>
            {/* No live Master Priority List / active-task source is wired into the
                app yet (docs/AGENT_RUNBOOK.md's Chief Intake Rule reads those from
                knowledge/ by hand) — show that honestly instead of inventing one. */}
            <span className="chief-home-priority-value chief-home-priority-value--unwired">
              Not wired yet
            </span>
          </div>
          <div className="chief-home-priority-item">
            <span className="chief-home-priority-label">Current task</span>
            {currentTask ? (
              <button
                type="button"
                className="chief-home-priority-value chief-home-priority-value--link"
                onClick={() =>
                  approvalSnapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                title={currentTask.summary}
              >
                {currentTask.title}
              </button>
            ) : (
              <span className="chief-home-priority-value chief-home-priority-value--empty">
                Queue clear
              </span>
            )}
          </div>
        </header>

        <section className="chief-lane-rail" aria-label="Chief, Builder, and Research lane status">
          <div className="chief-lane-row">
            <span className="chief-lane-name">Chief</span>
            <span className={`badge badge-${chiefLane.tone}`}>{chiefLane.state}</span>
            <span className="chief-lane-detail">{chiefLane.detail}</span>
          </div>
          <div className="chief-lane-row">
            <span className="chief-lane-name">Builder</span>
            <span className={`badge badge-${builderLane.tone}`}>{builderLane.state}</span>
            <span className="chief-lane-detail">{builderLane.detail}</span>
          </div>
          <div className="chief-lane-row">
            <span className="chief-lane-name">Research</span>
            <span className={`badge badge-${researchLane.tone}`}>{researchLane.state}</span>
            <span className="chief-lane-detail">{researchLane.detail}</span>
          </div>
        </section>

        <ChiefSituationBrief
          context={liveContext}
          pendingApprovalCount={pendingApprovals.length}
          onOpenApprovals={() =>
            approvalSnapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          platformHealth={platformHealth}
          liveApiEnabled={liveApi}
        />

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

          {isChiefAiFallbackEnabled() ? (
            <label className="chief-local-only-toggle">
              <input
                type="checkbox"
                checked={preferLocalOnly}
                onChange={(event) => setPreferLocalOnly(event.target.checked)}
              />
              Prefer local only (Ollama, no cloud calls)
            </label>
          ) : null}

          {response ? (
            <div className="chief-home-response" aria-live="polite">
              <p className="chief-home-response-summary">{response.summary}</p>
              {isEnhancing ? (
                <p className="chief-response-enhancing">Checking with AI for a better answer…</p>
              ) : null}
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

        <ApprovalActivityCard approvals={approvals} />
      </div>
    </Panel>
  );
}
