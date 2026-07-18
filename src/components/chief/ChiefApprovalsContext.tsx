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
  BUILDER_MISSION_COMPLETE_DELAY_MS,
  BUILDER_MISSION_START_DELAY_MS,
  completeBuilderMission,
  decideBuilderMissionStart,
  findMissionForProposal,
  materializeQueuedMission,
  startBuilderMission,
  upsertBuilderMission,
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
   * Idempotent: reuses an existing in-flight or terminal mission.
   */
  launchBuilderMission: (proposalId: string) => BuilderMissionLaunchResult;
  /**
   * Explicit retry for a failed Builder mission. Preserves prior attempt
   * history and increments attempt count. Still gated by policy.
   */
  retryBuilderMission: (proposalId: string) => BuilderMissionLaunchResult;
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

  /**
   * Progressive stub runner with atomic decide-and-queue inside setState so
   * double-clicks / approve replay cannot create a second in-flight mission.
   * Advances queued → running → completed|failed on short delays.
   */
  const beginProgressiveBuilderMission = useCallback(
    (
      proposal: ApprovalProposal,
      options: { explicitRetry?: boolean } = {},
    ): BuilderMissionLaunchResult => {
      // Holder avoids TS narrowing `let` across the setState callback.
      const holder: {
        result: BuilderMissionLaunchResult;
        queued: BuilderMissionRecord | null;
        wasRetry: boolean;
      } = {
        result: { outcome: "blocked", reason: "not_forwardable" },
        queued: null,
        wasRetry: false,
      };

      // Decision + insert happen in one updater — no stale "check then create".
      setBuilderMissions((prev) => {
        const decision = decideBuilderMissionStart(proposal, prev, options);
        if (decision.kind === "blocked") {
          holder.result = { outcome: "blocked", reason: decision.reason };
          return prev;
        }
        if (decision.kind === "reuse_existing") {
          holder.result = {
            outcome: "reused",
            record: decision.record,
            reason: decision.reason,
          };
          return prev;
        }

        const queued = materializeQueuedMission(decision);
        if (!queued) {
          holder.result = { outcome: "blocked", reason: "not_forwardable" };
          return prev;
        }

        holder.queued = queued;
        holder.wasRetry = decision.kind === "retry";
        holder.result = holder.wasRetry
          ? { outcome: "retried", record: queued }
          : {
              outcome: "launched",
              record: queued,
              steps: { queued, running: queued, final: queued },
            };
        return upsertBuilderMission(prev, queued);
      });

      if (holder.result.outcome === "reused") {
        chiefLog.missionReusedExisting(holder.result.record, holder.result.reason);
        return holder.result;
      }
      if (holder.result.outcome === "blocked" || !holder.queued) {
        return holder.result;
      }

      const queued = holder.queued;
      if (holder.wasRetry) {
        chiefLog.missionRetryRequested(queued);
      }
      chiefLog.missionLifecycle(queued, "queued");

      const proposalId = proposal.id;
      const attempt = queued.attempt;

      window.setTimeout(() => {
        setBuilderMissions((prev) => {
          const current = findMissionForProposal(prev, proposalId);
          // Ignore stale timers after a newer attempt or if already advanced.
          if (
            !current ||
            current.status !== "queued" ||
            current.attempt !== attempt
          ) {
            return prev;
          }
          const running = startBuilderMission(current);
          chiefLog.missionLifecycle(running, "started");
          return upsertBuilderMission(prev, running);
        });

        window.setTimeout(() => {
          setBuilderMissions((prev) => {
            const current = findMissionForProposal(prev, proposalId);
            if (
              !current ||
              current.status !== "running" ||
              current.attempt !== attempt
            ) {
              return prev;
            }
            const final = completeBuilderMission(current);
            chiefLog.missionLifecycle(
              final,
              final.status === "failed" ? "failed" : "completed",
            );
            return upsertBuilderMission(prev, final);
          });
        }, BUILDER_MISSION_COMPLETE_DELAY_MS);
      }, BUILDER_MISSION_START_DELAY_MS);

      return holder.result;
    },
    [],
  );

  const tryLaunchBuilderMission = useCallback(
    (proposal: ApprovalProposal): BuilderMissionLaunchResult => {
      // Overlay approved status for eligibility — the decision was just
      // recorded but the merged approvals list may not have re-rendered yet.
      const approvedProposal: ApprovalProposal = {
        ...proposal,
        status: "approved",
      };
      return beginProgressiveBuilderMission(approvedProposal);
    },
    [beginProgressiveBuilderMission],
  );

  const launchBuilderMission = useCallback(
    (proposalId: string): BuilderMissionLaunchResult => {
      const proposal = proposalsById.get(proposalId);
      if (!proposal) {
        return { outcome: "blocked", reason: "not_approved" };
      }
      return beginProgressiveBuilderMission(proposal);
    },
    [proposalsById, beginProgressiveBuilderMission],
  );

  const retryBuilderMission = useCallback(
    (proposalId: string): BuilderMissionLaunchResult => {
      const proposal = proposalsById.get(proposalId);
      if (!proposal) {
        return { outcome: "blocked", reason: "not_approved" };
      }
      // Retry only when the card is already approved — do not silently approve.
      if (proposal.status !== "approved") {
        return { outcome: "blocked", reason: "not_approved" };
      }
      return beginProgressiveBuilderMission(proposal, { explicitRetry: true });
    },
    [proposalsById, beginProgressiveBuilderMission],
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
      retryBuilderMission,
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
      retryBuilderMission,
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
