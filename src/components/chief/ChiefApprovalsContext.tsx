import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useData } from "@/context/DataContext";
import { useChiefContext } from "@/context/ChiefContextProvider";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import { deriveResearchStartApprovals } from "./researchStartApprovals";
import {
  ChiefApprovalConflictError,
  fetchChiefApprovalDecisions,
  isLiveApiEnabled,
  recordChiefApprovalDecision,
} from "@/lib/api/client";
import { AGENT_APPROVAL_CARDS } from "./agentApprovalGates";
import { chiefLog } from "./chiefLog";
import { MOCK_PR_APPROVAL_CARDS } from "./chiefApprovalCardMocks";
import { REPO_CHANGE_APPROVAL_CARDS } from "./repoChangeApprovals";
import { MS_PAINTING_APPROVAL_CARDS } from "./msPaintingApprovals";
import { scopeDataToChiefContext } from "./chiefContextScope";
import { APPROVAL_ACTION_DELAY_MS, approvalActionToStatus } from "./chiefApproval";
import {
  buildChiefLiveContext,
  deriveApprovalCandidates,
  mergeApprovalSources,
  type ChiefLiveContext,
} from "./chiefLiveContext";
import { deriveMonitorApprovalCards } from "./monitorApprovalCards";
import { buildApprovalActivitySnapshot } from "./approvalActivityHelpers";
import { deriveChiefSituationBriefFromMonitor } from "./chiefMonitorSituation";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import {
  notifyGovernedApprovalCreated,
  notifyGovernedMonitorState,
} from "@/lib/api/governedSlackNotify";
import type { ApprovalActivityRecord } from "../../../lib/approvals/types";
import { buildApprovalActivityRecord } from "../../../lib/approvals/approvalActivity";
import type { MockData } from "@/data/mockData";
import type {
  ApprovalAction,
  ApprovalDecision,
  ApprovalProposal,
  CommandHistoryEntry,
} from "./types";

interface ChiefApprovalsContextValue {
  /** Data already filtered to Chief's active context (chiefContextScope.ts) — global is a passthrough. Use this, not useData()'s raw `data`, for anything Chief-surfaced. */
  chiefData: MockData;
  liveContext: ChiefLiveContext;
  /** Fully merged, decision-applied approval queue — the one source both ChiefPanel and the homepage panel read. */
  approvals: ApprovalProposal[];
  pendingApprovalCount: number;
  proposalsById: Map<string, ApprovalProposal>;
  decisionsHydrated: boolean;
  /** Set when the last saved-decisions refresh failed; cleared on the next successful one. Approvals shown may not reflect current server state while this is set. */
  decisionsHydrationError: string | null;
  liveApi: boolean;
  addCommandApproval: (proposal: ApprovalProposal) => void;
  /** Shared command history — the one source both ChiefPanel's History tab and the homepage panel's intake write to. */
  history: CommandHistoryEntry[];
  addHistoryEntry: (entry: CommandHistoryEntry) => void;
  /**
   * Records an approve/reject/send-back decision against the shared
   * queue. Callers that render per-action UI feedback (loading/success/
   * error — e.g. ChiefPanel's approve/reject buttons) still own that
   * transient state locally; this only owns the decision record itself,
   * so every surface reading `approvals` sees the same thing.
   */
  recordDecision: (id: string, action: ApprovalAction) => Promise<ApprovalDecision>;
  /** Mock-mode session activity and live-mode optimistic rows before vault refresh. */
  sessionApprovalActivity: ApprovalActivityRecord[];
  /** Set when a live decision persisted to Supabase but vault activity logging failed. */
  lastActivityPersistError: string | null;
}

const ChiefApprovalsContext = createContext<ChiefApprovalsContextValue | null>(null);

export function ChiefApprovalsProvider({ children }: { children: ReactNode }) {
  const { data, source } = useData();
  const { activeContext } = useChiefContext();
  const { allRequests: researchRequests, updateRequestStatus: updateResearchRequestStatus } =
    useResearchRequests();
  // The real context switch: everything below derives from chiefData, not
  // the raw global `data` — so approval candidates, board items, and command
  // routing all see only the active context's tasks/workflow/customer once
  // activeContext !== "global". See chiefContextScope.ts.
  const chiefData = useMemo(() => scopeDataToChiefContext(data, activeContext), [data, activeContext]);
  const liveContext = useMemo(() => buildChiefLiveContext(chiefData), [chiefData]);
  const derivedApprovals = useMemo(
    () => deriveApprovalCandidates(chiefData, liveContext),
    [chiefData, liveContext],
  );

  // Static approval sources are context-scoped, not merged once and filtered
  // after: global's demo PR cards (chiefApprovalCardMocks.ts), the one real
  // wired repo-change source (repoChangeApprovals.ts), and one example
  // request per agent (agentApprovalGates.ts) only ever appear in the
  // "global" context. M&S Painting has its own source instead
  // (msPaintingApprovals.ts) — a real governed Research mission wired to its
  // workflow, not a copy of the global demo cards. See
  // docs/CHIEF_CONTEXT_SWITCHING.md.
  const contextStaticApprovalCards = useMemo(() => {
    if (activeContext === "ms-painting") return MS_PAINTING_APPROVAL_CARDS;
    return [...MOCK_PR_APPROVAL_CARDS, ...REPO_CHANGE_APPROVAL_CARDS, ...AGENT_APPROVAL_CARDS];
  }, [activeContext]);

  // Dynamic proposals the operator creates by typing a Chief command
  // (addCommandApproval) — each stamped with the context it was created in
  // (see addCommandApproval below) so switching context filters these too,
  // same as every other source. Starts empty; the old static seed list
  // moved to contextStaticApprovalCards above.
  const [commandApprovals, setCommandApprovals] = useState<ApprovalProposal[]>([]);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, ApprovalDecision>>({});
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [sessionApprovalActivity, setSessionApprovalActivity] = useState<ApprovalActivityRecord[]>(
    [],
  );
  const [lastActivityPersistError, setLastActivityPersistError] = useState<string | null>(null);

  const liveApi = isLiveApiEnabled();
  const platformHealth = useMonitorHealth();
  const lastMonitorSlackStateRef = useRef<string | null>(null);
  const monitorApprovalSlackNotifiedRef = useRef(false);
  const [decisionsHydrated, setDecisionsHydrated] = useState(!liveApi);
  const [decisionsHydrationError, setDecisionsHydrationError] = useState<string | null>(null);
  const [monitorIssueSeenAt, setMonitorIssueSeenAt] = useState<string | null>(null);

  const derivedMonitorCards = useMemo(
    () =>
      deriveMonitorApprovalCards({
        liveApiEnabled: liveApi,
        platformHealth,
      }),
    [liveApi, platformHealth],
  );

  useEffect(() => {
    if (derivedMonitorCards.length === 0) {
      setMonitorIssueSeenAt(null);
      return;
    }
    setMonitorIssueSeenAt((prev) => prev ?? new Date().toISOString());
  }, [derivedMonitorCards.length]);

  useEffect(() => {
    if (!liveApi) return;

    if (derivedMonitorCards.length === 0) {
      monitorApprovalSlackNotifiedRef.current = false;
      return;
    }

    if (monitorApprovalSlackNotifiedRef.current) return;

    const card = derivedMonitorCards[0];
    monitorApprovalSlackNotifiedRef.current = true;
    notifyGovernedApprovalCreated({
      approvalId: card.id,
    });
  }, [derivedMonitorCards, liveApi]);

  useEffect(() => {
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: liveApi,
      platformHealth,
    });

    if (brief.tone === "loading") return;

    const probeId =
      brief.tone === "mock"
        ? "mock"
        : brief.allIssues.length > 0
          ? brief.allIssues
              .map((issue) => (issue.startsWith("Vercel:") ? "vercel" : "supabase"))
              .join("+")
          : "vercel+supabase";

    const stateKey = `${brief.tone}:${probeId}`;
    if (lastMonitorSlackStateRef.current === stateKey) return;
    lastMonitorSlackStateRef.current = stateKey;

    notifyGovernedMonitorState({
      state: brief.tone,
      probeId,
    });
  }, [liveApi, platformHealth]);

  const monitorApprovals = useMemo(() => {
    if (derivedMonitorCards.length === 0) return [];
    const createdAt = monitorIssueSeenAt ?? derivedMonitorCards[0].createdAt;
    return derivedMonitorCards.map((card) => ({ ...card, createdAt }));
  }, [derivedMonitorCards, monitorIssueSeenAt]);

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
        setDecisionsHydrationError(null);
      })
      .catch((error: unknown) => {
        // Leave previously hydrated/optimistic decisions in place — a failed
        // refetch shouldn't erase decisions the operator already recorded.
        // Surface the failure so the operator knows the list may be stale
        // rather than silently trusting an unrefreshed queue.
        if (cancelled) return;
        setDecisionsHydrationError(
          error instanceof Error ? error.message : "Failed to refresh saved decisions",
        );
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

  // Command-created proposals are tagged with the context they were made in
  // (addCommandApproval below); only the active context's own proposals
  // surface. Monitor/platform-health cards are inherently global
  // infrastructure signal, not project work — they never appear outside the
  // "global" context.
  const contextCommandApprovals = useMemo(
    () => commandApprovals.filter((proposal) => (proposal.contextId ?? "global") === activeContext),
    [commandApprovals, activeContext],
  );
  const contextMonitorApprovals = useMemo(
    () => (activeContext === "global" ? monitorApprovals : []),
    [activeContext, monitorApprovals],
  );

  // One card per queued research request — global-only for now, same as
  // monitor cards, since the research queue isn't yet scoped per Chief
  // context. Approving releases the row to in_progress (see recordDecision).
  const contextResearchStartApprovals = useMemo(
    () => (activeContext === "global" ? deriveResearchStartApprovals(researchRequests) : []),
    [activeContext, researchRequests],
  );

  const approvals = useMemo(() => {
    const merged = mergeApprovalSources(
      derivedApprovals,
      contextStaticApprovalCards,
      contextCommandApprovals,
      contextMonitorApprovals,
      contextResearchStartApprovals,
    );
    return merged.map((proposal) => {
      const decision = approvalDecisions[proposal.id];
      if (!decision) return proposal;
      return {
        ...proposal,
        status: decision.status,
        decidedAt: decision.decidedAt,
        decidedBy: decision.actor ?? undefined,
      };
    });
  }, [
    derivedApprovals,
    contextStaticApprovalCards,
    contextCommandApprovals,
    contextMonitorApprovals,
    contextResearchStartApprovals,
    approvalDecisions,
  ]);

  const pendingApprovalCount = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending").length,
    [approvals],
  );

  const proposalsById = useMemo(
    () => new Map(approvals.map((proposal) => [proposal.id, proposal])),
    [approvals],
  );

  const addCommandApproval = useCallback((proposal: ApprovalProposal) => {
    // Stamp with the context Chief was operating in when the command ran, so
    // a later context switch filters it the same as any other source.
    const tagged: ApprovalProposal = { ...proposal, contextId: proposal.contextId ?? activeContext };
    setCommandApprovals((prev) => [tagged, ...prev]);
    // Canonical Chief observability event (see chiefLog.ts / chiefGovernanceEvents.ts) — observability-only, must not block enqueue.
    chiefLog.cardCreated(tagged);

    if (liveApi) {
      notifyGovernedApprovalCreated({
        approvalId: tagged.id,
        missionKind: tagged.missionKind,
        missionProjectId: tagged.missionProjectId,
      });
    }
  }, [liveApi, activeContext]);

  const addHistoryEntry = useCallback((entry: CommandHistoryEntry) => {
    setHistory((prev) => [entry, ...prev]);
  }, []);

  const appendSessionActivity = useCallback((record: ApprovalActivityRecord) => {
    setSessionApprovalActivity((prev) => {
      const withoutDuplicate = prev.filter((entry) => entry.proposalId !== record.proposalId);
      return [record, ...withoutDuplicate];
    });
  }, []);

  // Approval → research bridge: an approved card carrying a researchRequestId
  // releases its queue row to in_progress — the runner's pickup signal.
  // Failure to transition (already released, done, etc.) never fails the
  // decision itself; the queue row's real state wins.
  const releaseResearchRequest = useCallback(
    (requestId: string | undefined) => {
      if (!requestId) return;
      try {
        updateResearchRequestStatus(requestId, "in_progress");
      } catch (error) {
        console.error("[research-rail] approval_release_failed", { requestId, error });
      }
    },
    [updateResearchRequestStatus],
  );

  const recordDecision = useCallback(
    async (id: string, action: ApprovalAction): Promise<ApprovalDecision> => {
      const nextStatus = approvalActionToStatus(action);
      const decidedCard = proposalsById.get(id);

      if (liveApi) {
        try {
          const activitySnapshot = decidedCard
            ? buildApprovalActivitySnapshot(decidedCard, {
                decision: nextStatus,
                decidedAt: new Date().toISOString(),
                actor: null,
              })
            : undefined;

          const result = await recordChiefApprovalDecision(
            id,
            nextStatus,
            null,
            activitySnapshot && decidedCard
              ? {
                  title: activitySnapshot.title,
                  summary: activitySnapshot.summary,
                  source: activitySnapshot.source,
                  category: activitySnapshot.category,
                  missionKind: activitySnapshot.missionKind,
                  missionProjectId: decidedCard.missionProjectId,
                }
              : undefined,
          );

          const applied: ApprovalDecision = {
            proposalId: result.decision.proposalId,
            status: result.decision.status,
            decidedAt: result.decision.decidedAt,
            actor: result.decision.actor,
          };
          applyDecision(applied);
          if (nextStatus === "approved") releaseResearchRequest(decidedCard?.researchRequestId);

          if (result.activity && !result.activity.recorded) {
            setLastActivityPersistError(result.activity.error ?? "Activity log write failed");
          } else {
            setLastActivityPersistError(null);
          }

          if (decidedCard && activitySnapshot) {
            appendSessionActivity(
              buildApprovalActivityRecord({
                ...activitySnapshot,
                decidedAt: applied.decidedAt,
                actor: applied.actor,
              }),
            );
          }

          if (decidedCard) chiefLog.cardDecided(decidedCard, action);
          return applied;
        } catch (error) {
          if (error instanceof ChiefApprovalConflictError) {
            applyDecision(error.decision);
          }
          throw error;
        }
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, APPROVAL_ACTION_DELAY_MS);
      });
      const decision: ApprovalDecision = {
        proposalId: id,
        status: nextStatus,
        decidedAt: new Date().toISOString(),
        actor: null,
      };
      applyDecision(decision);
      if (nextStatus === "approved") releaseResearchRequest(decidedCard?.researchRequestId);

      if (decidedCard) {
        appendSessionActivity(
          buildApprovalActivityRecord(
            buildApprovalActivitySnapshot(decidedCard, {
              decision: nextStatus,
              decidedAt: decision.decidedAt,
              actor: decision.actor,
            }),
          ),
        );
        chiefLog.cardDecided(decidedCard, action);
      }

      return decision;
    },
    [liveApi, applyDecision, proposalsById, appendSessionActivity, releaseResearchRequest],
  );

  const value = useMemo<ChiefApprovalsContextValue>(
    () => ({
      chiefData,
      liveContext,
      approvals,
      pendingApprovalCount,
      proposalsById,
      decisionsHydrated,
      decisionsHydrationError,
      liveApi,
      addCommandApproval,
      recordDecision,
      history,
      addHistoryEntry,
      sessionApprovalActivity,
      lastActivityPersistError,
    }),
    [
      chiefData,
      liveContext,
      approvals,
      pendingApprovalCount,
      proposalsById,
      decisionsHydrated,
      decisionsHydrationError,
      liveApi,
      addCommandApproval,
      recordDecision,
      history,
      addHistoryEntry,
      sessionApprovalActivity,
      lastActivityPersistError,
    ],
  );

  return (
    <ChiefApprovalsContext.Provider value={value}>{children}</ChiefApprovalsContext.Provider>
  );
}

export function useChiefApprovals() {
  const ctx = useContext(ChiefApprovalsContext);
  if (!ctx) throw new Error("useChiefApprovals must be used within ChiefApprovalsProvider");
  return ctx;
}
