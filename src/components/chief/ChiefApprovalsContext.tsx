import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useData } from "@/context/DataContext";
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
import { APPROVAL_ACTION_DELAY_MS, approvalActionToStatus } from "./chiefApproval";
import {
  evaluateApprovalPolicy,
  applyPolicyToProposal,
  type ApprovalPolicyContext,
  type ApprovalPolicyResult,
} from "./chiefApprovalPolicy";
import {
  launchBuilderMissionFromProposal,
  type BuilderMissionLaunchResult,
  type BuilderMissionRecord,
} from "./builderMission";
import {
  buildChiefLiveContext,
  deriveApprovalCandidates,
  mergeApprovalSources,
  type ChiefLiveContext,
} from "./chiefLiveContext";
import type {
  ApprovalAction,
  ApprovalDecision,
  ApprovalProposal,
  CommandHistoryEntry,
} from "./types";

interface ChiefApprovalsContextValue {
  liveContext: ChiefLiveContext;
  /** Fully merged, decision-applied approval queue — the one source both ChiefPanel and the homepage panel read. */
  approvals: ApprovalProposal[];
  /** Proposals forwarded for approval (passed confidence threshold and checklist). */
  forwardedApprovals: ApprovalProposal[];
  /** Proposals returned for refinement (below confidence threshold or checklist failed). */
  refinementQueue: ApprovalProposal[];
  /** Session-scoped Builder missions launched from approved Build proposals. */
  builderMissions: BuilderMissionRecord[];
  pendingApprovalCount: number;
  proposalsById: Map<string, ApprovalProposal>;
  decisionsHydrated: boolean;
  /** Set when the last saved-decisions refresh failed; cleared on the next successful one. Approvals shown may not reflect current server state while this is set. */
  decisionsHydrationError: string | null;
  liveApi: boolean;
  /**
   * Adds a proposal and evaluates it against Chief's approval policy.
   * If confidence >= 0.9 and checklist passes, it's forwarded for approval.
   * Otherwise, it's returned for refinement with guidance.
   */
  addCommandApproval: (proposal: ApprovalProposal, ctx?: Partial<ApprovalPolicyContext>) => void;
  /** Shared command history — the one source both ChiefPanel's History tab and the homepage panel's intake write to. */
  history: CommandHistoryEntry[];
  addHistoryEntry: (entry: CommandHistoryEntry) => void;
  /**
   * Records an approve/reject/send-back decision against the shared
   * queue. Callers that render per-action UI feedback (loading/success/
   * error — e.g. ChiefPanel's approve/reject buttons) still own that
   * transient state locally; this only owns the decision record itself,
   * so every surface reading `approvals` sees the same thing.
   *
   * When action is "approved" and the proposal is a forwardable Builder
   * card, also launches a Builder mission (queued → running →
   * completed|failed) via the typed mission contract.
   */
  recordDecision: (id: string, action: ApprovalAction) => Promise<ApprovalDecision>;
  /**
   * Re-evaluates a proposal that was previously returned for refinement.
   * Returns the updated policy result.
   */
  reEvaluateProposal: (id: string, ctx?: Partial<ApprovalPolicyContext>) => ApprovalPolicyResult | null;
  /**
   * Manual Builder mission launch for an already-approved, forwardable
   * Build proposal. Same eligibility rules as the auto-launch on approve.
   */
  launchBuilderMission: (proposalId: string) => BuilderMissionLaunchResult;
}

const ChiefApprovalsContext = createContext<ChiefApprovalsContextValue | null>(null);

export function ChiefApprovalsProvider({ children }: { children: ReactNode }) {
  const { data, source } = useData();
  const liveContext = useMemo(() => buildChiefLiveContext(data), [data]);
  const derivedApprovals = useMemo(
    () => deriveApprovalCandidates(data, liveContext),
    [data, liveContext],
  );

  // Seeded with demo PR cards (chiefApprovalCardMocks.ts), the one real
  // wired source (pending local repo changes, repoChangeApprovals.ts), and
  // one example request per agent (agentApprovalGates.ts) — so every
  // approval, from any source or surface, routes through this one shared
  // queue. See agentApprovalGates.ts's header and docs/AGENT_WORKFLOW.md
  // for the single-queue rule this preserves.
  const [commandApprovals, setCommandApprovals] = useState<ApprovalProposal[]>([
    ...MOCK_PR_APPROVAL_CARDS,
    ...REPO_CHANGE_APPROVAL_CARDS,
    ...AGENT_APPROVAL_CARDS,
  ]);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, ApprovalDecision>>({});
  const [builderMissions, setBuilderMissions] = useState<BuilderMissionRecord[]>([]);
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);

  const liveApi = isLiveApiEnabled();
  const [decisionsHydrated, setDecisionsHydrated] = useState(!liveApi);
  const [decisionsHydrationError, setDecisionsHydrationError] = useState<string | null>(null);

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

  const approvals = useMemo(() => {
    const merged = mergeApprovalSources(derivedApprovals, commandApprovals);
    return merged.map((proposal) => {
      const decision = approvalDecisions[proposal.id];
      let updated = proposal;

      if (decision) {
        updated = {
          ...updated,
          status: decision.status,
          decidedAt: decision.decidedAt,
          decidedBy: decision.actor ?? undefined,
        };
      }

      if (!updated.routingDisposition) {
        const policyResult = evaluateApprovalPolicy({ proposal: updated });
        updated = applyPolicyToProposal(updated, policyResult);
      }

      return updated;
    });
  }, [derivedApprovals, commandApprovals, approvalDecisions]);

  const forwardedApprovals = useMemo(
    () => approvals.filter((p) => p.routingDisposition === "forwarded"),
    [approvals],
  );

  const refinementQueue = useMemo(
    () => approvals.filter((p) => p.routingDisposition === "needs_refinement"),
    [approvals],
  );

  const pendingApprovalCount = useMemo(
    () => forwardedApprovals.filter((proposal) => proposal.status === "pending").length,
    [forwardedApprovals],
  );

  const proposalsById = useMemo(
    () => new Map(approvals.map((proposal) => [proposal.id, proposal])),
    [approvals],
  );

  const addCommandApproval = useCallback(
    (proposal: ApprovalProposal, ctx?: Partial<ApprovalPolicyContext>) => {
      const policyResult = evaluateApprovalPolicy({ proposal, ...ctx });
      const evaluatedProposal = applyPolicyToProposal(proposal, policyResult);

      setCommandApprovals((prev) => [evaluatedProposal, ...prev]);

      chiefLog.cardCreated(evaluatedProposal);
      chiefLog.cardRouted(
        evaluatedProposal,
        policyResult.disposition,
        evaluatedProposal.confidence ?? 0,
        policyResult.reason,
        policyResult.missingSignals,
        policyResult.evidenceSummary,
      );
    },
    [],
  );

  const reEvaluateProposal = useCallback(
    (id: string, ctx?: Partial<ApprovalPolicyContext>): ApprovalPolicyResult | null => {
      const proposal = proposalsById.get(id);
      if (!proposal) return null;

      const policyResult = evaluateApprovalPolicy({ proposal, ...ctx });
      const evaluatedProposal = applyPolicyToProposal(proposal, policyResult);

      setCommandApprovals((prev) =>
        prev.map((p) => (p.id === id ? evaluatedProposal : p)),
      );

      chiefLog.cardRouted(
        evaluatedProposal,
        policyResult.disposition,
        evaluatedProposal.confidence ?? 0,
        policyResult.reason,
        policyResult.missingSignals,
        policyResult.evidenceSummary,
      );

      return policyResult;
    },
    [proposalsById],
  );

  const addHistoryEntry = useCallback((entry: CommandHistoryEntry) => {
    setHistory((prev) => [entry, ...prev]);
  }, []);

  const logAndStoreMissionLaunch = useCallback((launch: BuilderMissionLaunchResult) => {
    if (launch.outcome !== "launched") return;
    chiefLog.missionLifecycle(launch.steps.queued, "queued");
    chiefLog.missionLifecycle(launch.steps.running, "started");
    chiefLog.missionLifecycle(
      launch.steps.final,
      launch.steps.final.status === "failed" ? "failed" : "completed",
    );
    setBuilderMissions((prev) => [launch.record, ...prev]);
  }, []);

  const tryLaunchBuilderMission = useCallback(
    (proposal: ApprovalProposal): BuilderMissionLaunchResult => {
      // Overlay approved status for eligibility — the decision was just
      // recorded but the merged approvals list may not have re-rendered yet.
      const approvedProposal: ApprovalProposal = {
        ...proposal,
        status: "approved",
      };
      const launch = launchBuilderMissionFromProposal(approvedProposal, builderMissions);
      logAndStoreMissionLaunch(launch);
      return launch;
    },
    [builderMissions, logAndStoreMissionLaunch],
  );

  const launchBuilderMission = useCallback(
    (proposalId: string): BuilderMissionLaunchResult => {
      const proposal = proposalsById.get(proposalId);
      if (!proposal) {
        return { outcome: "blocked", reason: "not_approved" };
      }
      const launch = launchBuilderMissionFromProposal(proposal, builderMissions);
      logAndStoreMissionLaunch(launch);
      return launch;
    },
    [proposalsById, builderMissions, logAndStoreMissionLaunch],
  );

  const recordDecision = useCallback(
    async (id: string, action: ApprovalAction): Promise<ApprovalDecision> => {
      const nextStatus = approvalActionToStatus(action);

      if (liveApi) {
        try {
          const decision = await recordChiefApprovalDecision(id, nextStatus);
          const applied: ApprovalDecision = {
            proposalId: decision.proposalId,
            status: decision.status,
            decidedAt: decision.decidedAt,
            actor: decision.actor,
          };
          applyDecision(applied);
          const decidedCard = proposalsById.get(id);
          if (decidedCard) {
            chiefLog.cardDecided(decidedCard, action);
            if (action === "approved") {
              tryLaunchBuilderMission(decidedCard);
            }
          }
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
      const decidedCard = proposalsById.get(id);
      if (decidedCard) {
        chiefLog.cardDecided(decidedCard, action);
        if (action === "approved") {
          tryLaunchBuilderMission(decidedCard);
        }
      }
      return decision;
    },
    [liveApi, applyDecision, proposalsById, tryLaunchBuilderMission],
  );

  const value = useMemo<ChiefApprovalsContextValue>(
    () => ({
      liveContext,
      approvals,
      forwardedApprovals,
      refinementQueue,
      builderMissions,
      pendingApprovalCount,
      proposalsById,
      decisionsHydrated,
      decisionsHydrationError,
      liveApi,
      addCommandApproval,
      recordDecision,
      history,
      addHistoryEntry,
      reEvaluateProposal,
      launchBuilderMission,
    }),
    [
      liveContext,
      approvals,
      forwardedApprovals,
      refinementQueue,
      builderMissions,
      pendingApprovalCount,
      proposalsById,
      decisionsHydrated,
      decisionsHydrationError,
      liveApi,
      addCommandApproval,
      recordDecision,
      history,
      addHistoryEntry,
      reEvaluateProposal,
      launchBuilderMission,
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
