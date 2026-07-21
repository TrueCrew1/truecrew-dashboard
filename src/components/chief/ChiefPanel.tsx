import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/context/DataContext";
import {
  askChiefAiFallback,
  ChiefApprovalConflictError,
  formatDataSourceLabel,
  isChiefAiFallbackEnabled,
  isChiefLocalOnlyModeDefault,
  isLiveApiEnabled,
} from "@/lib/api/client";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { subscribeChiefApprovalFocus } from "./chiefApprovalFocus";
import { ApprovalAlertsPanel } from "./ApprovalAlertsPanel";
import { ApprovalBoard } from "./ApprovalBoard";
import { ChiefQueueStrip } from "./ChiefQueueStrip";
import { CommandHistory } from "./CommandHistory";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import { approvalActionSuccessMessage, type ApprovalActionState } from "./chiefApproval";
import { deriveChiefBoardItems } from "./chiefApprovalBoard";
import { buildChiefContextSummary, resolveChiefCommand } from "./chiefCommandRouter";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { SpecialistCards } from "./SpecialistCards";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import { ChiefBoard } from "./ChiefBoard";
import { AgentWorkBoard } from "./AgentWorkBoard";
import { GovernanceEventsPanel } from "./GovernanceEventsPanel";
import { RecentActivityStrip } from "./RecentActivityStrip";
import { emitTaskReprioritized } from "./chiefGovernanceEvents";
import { useChiefVoice } from "./useChiefVoice";
import type { ApprovalAction, ChiefResponse } from "./types";
import type { ApprovalStatusFilter } from "./approvalStatus";

const EXAMPLE_COMMANDS = [
  "What is at risk today?",
  "What's blocked?",
  "Show approvals I need to review",
  "What tasks are missing customer context?",
  "Show open alerts",
];

type ChiefTab = "command" | "board" | "agents" | "approvals" | "history" | "governance";

/** Dev-only observability tab — never shown in production builds. */
const SHOW_GOVERNANCE_TAB = import.meta.env.DEV;

export function ChiefPanel() {
  const { data, loading, source } = useData();
  const {
    liveContext,
    approvals,
    pendingApprovalCount,
    proposalsById,
    decisionsHydrated,
    addCommandApproval,
    recordDecision,
    history,
    addHistoryEntry,
  } = useChiefApprovals();

  const [activeTab, setActiveTab] = useState<ChiefTab>("command");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [preferLocalOnly, setPreferLocalOnly] = useState(isChiefLocalOnlyModeDefault);
  // Guards against a stale AI fallback response landing after a newer
  // command has already been submitted.
  const enhanceRequestIdRef = useRef(0);
  const [approvalActionStates, setApprovalActionStates] = useState<
    Record<string, ApprovalActionState>
  >({});
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ApprovalStatusFilter>("all");
  const liveApi = isLiveApiEnabled();
  // Same hook and endpoints Monitor already uses — no new polling or data source.
  const platformHealth = useMonitorHealth();
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Tracks whether the current `input` text came from a voice transcript
  // that hasn't since been hand-edited. Read (and cleared) at submit time so
  // only voice-originated commands trigger auto-speak below.
  const voiceOriginRef = useRef(false);
  // Set at submit time for a voice-originated command; consumed once the
  // matching response arrives so auto-speak fires exactly once per command.
  const pendingAutoSpeakRef = useRef(false);

  // Push-to-talk transcripts land in the same `input` state and command
  // form as typed text — there is no separate voice command path. The
  // operator still reviews/submits via Run, same as any typed command.
  const handleVoiceTranscript = useCallback((transcript: string) => {
    voiceOriginRef.current = true;
    setInput(transcript);
    commandInputRef.current?.focus();
  }, []);

  const {
    speakSupported,
    speaking,
    speak,
    stopSpeaking,
    inputStatus: voiceInputStatus,
    startListening,
    stopListening,
  } = useChiefVoice({ onTranscript: handleVoiceTranscript });

  const speakableResponseText = useMemo(() => {
    if (!response) return "";
    return [response.summary, ...(response.blockers ?? []), response.recommendedAction]
      .filter(Boolean)
      .join(". ");
  }, [response]);

  // Auto-speak exactly once per voice-originated command: `pendingAutoSpeakRef`
  // is only true right after a submit that started from an unedited voice
  // transcript, and is cleared here immediately so re-renders (and any
  // persisted response restored on reload) never replay it.
  useEffect(() => {
    if (!response || !pendingAutoSpeakRef.current) return;
    pendingAutoSpeakRef.current = false;
    speak(speakableResponseText);
  }, [response, speakableResponseText, speak]);

  const openApprovals = useCallback((filter: ApprovalStatusFilter = "all") => {
    setApprovalStatusFilter(filter);
    setActiveTab("approvals");
  }, []);

  const [focusProposalId, setFocusProposalId] = useState<string | null>(null);

  // Lets any surface (e.g. Today's Approval Activity card) land on one
  // proposal's exact card here — see chiefApprovalFocus.ts. Always resets
  // the status filter to "all" first so a stale filter can't hide the
  // target; ApprovalBoard does the actual scroll/highlight once it has the id.
  useEffect(() => {
    return subscribeChiefApprovalFocus((proposalId) => {
      setApprovalStatusFilter("all");
      setActiveTab("approvals");
      setFocusProposalId(proposalId);
    });
  }, []);

  // Temporary highlight only (matches .chief-approval-card--focused's 2s
  // pulse) — clears itself so the outline doesn't linger indefinitely.
  useEffect(() => {
    if (!focusProposalId) return;
    const timeout = setTimeout(() => setFocusProposalId(null), 2200);
    return () => clearTimeout(timeout);
  }, [focusProposalId]);

  const boardItems = useMemo(
    () => deriveChiefBoardItems(liveContext, approvals),
    [liveContext, approvals],
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
    emitTaskReprioritized(
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const command = input.trim();
    if (!command || isProcessing) return;

    pendingAutoSpeakRef.current = voiceOriginRef.current;
    voiceOriginRef.current = false;

    setIsProcessing(true);
    setActiveTab("command");
    setResponse(null);

    // resolveChiefCommand is synchronous (regex/keyword dispatch against
    // already-loaded live context, no I/O) — no artificial delay needed.
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

    // No specialist matched — optionally ask the Azure AI fallback for a
    // better answer than the canned DEFAULT_RESPONSE. Off by default
    // (VITE_CHIEF_AI_FALLBACK_ENABLED); silently keeps the deterministic
    // response on any failure or if a newer command supersedes this one.
    if (result.isGenericFallback && isChiefAiFallbackEnabled()) {
      const requestId = ++enhanceRequestIdRef.current;
      setIsEnhancing(true);
      askChiefAiFallback(command, buildChiefContextSummary(liveContext), preferLocalOnly)
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

  const handleExample = (example: string) => {
    voiceOriginRef.current = false;
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

      <ChiefQueueStrip
        approvals={approvals}
        pendingApprovalCount={pendingApprovalCount}
        onOpenApprovals={() => openApprovals("pending")}
        overdueTaskCount={liveContext.overdueTasks.length}
        onOpenBoard={() => setActiveTab("board")}
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
              onOpenApprovals={() => openApprovals("pending")}
              platformHealth={platformHealth}
              liveApiEnabled={liveApi}
            />

            <RecentActivityStrip />

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
                    <div className="chief-speaker-row-actions">
                      <span className="chief-speaker-badge">Response</span>
                      {speakSupported ? (
                        <button
                          type="button"
                          className={`chief-speak-btn${speaking ? " chief-speak-btn--active" : ""}`}
                          onClick={() =>
                            speaking ? stopSpeaking() : speak(speakableResponseText)
                          }
                          aria-pressed={speaking}
                          title={speaking ? "Stop reading aloud" : "Read this response aloud"}
                        >
                          {speaking ? "Stop" : "Speak"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="chief-response-text">{response.summary}</p>
                  {isEnhancing ? (
                    <p className="chief-response-enhancing" aria-live="polite">
                      Checking with AI for a better answer…
                    </p>
                  ) : null}
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
            />
            <ApprovalAlertsPanel />
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
            onChange={(event) => {
              voiceOriginRef.current = false;
              setInput(event.target.value);
            }}
            placeholder="e.g. What is at risk today?"
            aria-label="Chief command input"
            disabled={isProcessing}
            ref={commandInputRef}
          />
          <button
            type="button"
            className={`chief-mic-btn${voiceInputStatus === "listening" ? " chief-mic-btn--listening" : ""}`}
            disabled={isProcessing || voiceInputStatus === "unsupported"}
            aria-pressed={voiceInputStatus === "listening"}
            aria-label={
              voiceInputStatus === "unsupported" ? "Speech input unavailable" : "Push to talk"
            }
            title={
              voiceInputStatus === "unsupported"
                ? "Speech input isn't supported in this browser."
                : "Push to talk — hold to speak a command."
            }
            onPointerDown={() => startListening()}
            onPointerUp={() => stopListening()}
            onPointerLeave={() => stopListening()}
            onPointerCancel={() => stopListening()}
            onKeyDown={(event) => {
              if ((event.key === " " || event.key === "Enter") && voiceInputStatus !== "listening") {
                event.preventDefault();
                startListening();
              }
            }}
            onKeyUp={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                stopListening();
              }
            }}
          >
            {voiceInputStatus === "listening" ? "Listening…" : "\u{1F3A4}"}
          </button>
          <button
            type="submit"
            className="chief-submit"
            disabled={!input.trim() || isProcessing}
            title={!input.trim() ? "Enter a command to run" : undefined}
          >
            Run
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
      </form>
    </aside>
  );
}
