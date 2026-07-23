import { FormEvent, useMemo, useRef, useState } from "react";
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
import { useChiefContext } from "@/context/ChiefContextProvider";
import { isLiveApiEnabled } from "@/lib/api/client";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { useBuildTasks, type BuildGateTask } from "./hooks/useBuildTasks";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import { ChiefOperationalStatusPanel } from "./ChiefOperationalStatusPanel";
import { ChiefDailyTurnoverPanel } from "./ChiefDailyTurnoverPanel";
import { AgentStatusStrip } from "./AgentStatusStrip";
import { ChiefOpsDeskStrip } from "./ChiefOpsDeskStrip";
import { ChiefResponseCard } from "./ChiefResponseCard";
import {
  CHIEF_DEFAULT_LINE,
  deriveChiefDoingNow,
  deriveChiefOpsDeskSnapshot,
} from "./chiefVoice";
import type { AgentWorkItem, ApprovalProposal, ChiefBoardItem, ChiefResponse } from "./types";

const SNAPSHOT_LIMIT = 4;

const EXAMPLE_COMMANDS = [
  "What is at risk today?",
  "What's blocked?",
  "Show approvals I need to review",
];

interface LaneSummary {
  status: string;
  detail: string;
  tone: "neutral" | "warn" | "critical";
  count: number;
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
  const approvalSnapshotRef = useRef<HTMLDivElement>(null);
  const { activeContextDefinition } = useChiefContext();

  // Shared with the sidebar Chief panel (ChiefApprovalsContext) — same
  // merged, decision-applied queue, so counts here stay in sync with the
  // sidebar within the same session instead of only matching at load.
  const { chiefData, liveContext, approvals, addCommandApproval, addHistoryEntry } =
    useChiefApprovals();

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

  const builderLane = useMemo(() => buildBuilderLaneSummary(buildGateTasks), [buildGateTasks]);
  const researchLane = useMemo(
    () => buildResearchLaneSummary(activeResearchItems, researchApprovals),
    [activeResearchItems, researchApprovals],
  );

  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const scrollToApprovals = () => {
    approvalSnapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    window.setTimeout(() => {
      const result = resolveChiefCommand(trimmed, chiefData, liveContext, approvals);
      setResponse(result);
      addHistoryEntry(buildHistoryEntry(trimmed, result));

      const newApproval = buildApprovalFromResponse(trimmed, result);
      if (newApproval) {
        addCommandApproval(newApproval);
      }

      setIsProcessing(false);
    }, 320);
  };

  const handleExample = (example: string) => {
    setCommand(example);
  };

  return (
    <Panel title="Chief" action={<ChiefContextSwitcher />}>
      <div className="chief-home-panel chief-home-panel--ops-desk">
        <header className="chief-home-voice">
          <p className="chief-home-voice-line">{CHIEF_DEFAULT_LINE}</p>
          <p className="chief-home-voice-role">
            Foreman · router · operations lead — specialists report through him.
          </p>
        </header>

        {activeContextDefinition.kind === "project" ? (
          <p className="chief-home-context-banner" role="status">
            Operating inside <strong>{activeContextDefinition.label}</strong> — parent/global
            approvals and tasks are hidden. {activeContextDefinition.description}
          </p>
        ) : null}

        <ChiefOpsDeskStrip
          doingNow={doingNow}
          snapshot={opsDesk}
          onOpenApprovals={scrollToApprovals}
        />

        <ChiefSituationBrief
          context={liveContext}
          pendingApprovalCount={pendingApprovals.length}
          onOpenApprovals={scrollToApprovals}
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

          {!response && !isProcessing ? (
            <div className="chief-home-examples">
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
          ) : null}

          {isProcessing ? (
            <div className="chief-processing-card" aria-live="polite" aria-busy="true">
              <div className="chief-processing-header">
                <span className="chief-processing-dot" aria-hidden="true" />
                Chief is routing…
              </div>
            </div>
          ) : null}

          {response && !isProcessing ? (
            <ChiefResponseCard response={response} variant="home" onOpenApprovals={scrollToApprovals} />
          ) : null}
        </form>

        <div className="chief-home-snapshots" ref={approvalSnapshotRef}>
          <div
            className={`chief-home-snapshot${pendingApprovals.length > 0 ? " chief-home-snapshot--approval" : ""}`}
          >
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
                        <span className="chief-approval-badge">Decide</span>
                      </div>
                      <p className="chief-board-card-detail">{proposal.summary}</p>
                      <p className="chief-board-card-detail chief-home-snapshot-next">
                        Next: {proposal.recommendedAction}
                      </p>
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
                {blockedItems.slice(0, SNAPSHOT_LIMIT).map((item: ChiefBoardItem) => (
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

        <section className="chief-home-specialists" aria-label="Specialist load — report through Chief">
          <header className="chief-home-specialists-header">
            <h3 className="chief-home-specialists-title">Specialists</h3>
            <span className="chief-home-specialists-tag">Report through Chief</span>
          </header>
          <p className="chief-home-specialists-note">
            Builder executes. Research builds knowledge. Neither speaks to you directly.
          </p>
          <div className="chief-home-lanes chief-home-lanes--subordinate">
            <div className={`chief-home-lane chief-home-lane--subordinate chief-home-lane--${builderLane.tone}`}>
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

            <div className={`chief-home-lane chief-home-lane--subordinate chief-home-lane--${researchLane.tone}`}>
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
        </section>

        <AgentStatusStrip />

        <ChiefOperationalStatusPanel />

        <ChiefDailyTurnoverPanel />
      </div>
    </Panel>
  );
}
