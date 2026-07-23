import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildOperationalReadinessSummary } from "../../../lib/chief/operationalReadiness.js";
import { requireInternalAuth } from "../../../lib/auth.js";
import { listApprovalActivityRecords } from "../../../lib/approvals/approvalActivityStore.js";
import { recordApprovalDecisionActivity } from "../../../lib/approvals/recordApprovalDecisionActivity.js";
import { collectDailyTurnoverSnapshot } from "../../../lib/chief/collectDailyTurnoverSnapshot.js";
import {
  formatDailyTurnoverSlackMessage,
} from "../../../lib/chief/dailyTurnover.js";
import {
  formatMonitorStateMessage,
  governedLoopSlack,
  isGovernedChiefApproval,
  scheduleGovernedApprovalUpdatedSlack,
  scheduleGovernedApprovalCreatedSlack,
} from "../../../lib/governedLoopSlack.js";
import { mapDbChiefApprovalDecisionToClient } from "../../../lib/mappers/chief-approvals.js";
import { isVaultConfigured } from "../../../lib/obsidian/config.js";
import { isSupabaseConfigured } from "../../../lib/supabase/admin.js";
import {
  fetchChiefApprovalDecisions,
  insertChiefApprovalDecision,
  isChiefApprovalStatus,
} from "../../../lib/supabase/queries.js";
import { listOpenPullRequestsForRepos } from "../../../lib/github/listOpenPullRequests.js";
import { postScopedPullRequestComment } from "../../../lib/github/postPullRequestComment.js";
import { writeScopedProjectNote, ObsidianScopeWriteError } from "../../../lib/obsidian/writeScopedProjectNote.js";

const PERSONAS = ["founder", "operator", "observer"] as const;

function parseActor(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  return (PERSONAS as readonly string[]).includes(value) ? value : null;
}

function parseView(req: VercelRequest): string {
  const view = req.query?.view;
  return typeof view === "string" ? view.trim() : "";
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseActivityPayload(body: Record<string, unknown> | undefined) {
  const activity = body?.activity;
  if (!activity || typeof activity !== "object") return null;

  const payload = activity as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  if (!title) return null;

  return {
    title,
    summary,
    source: typeof payload.source === "string" ? payload.source.trim() : undefined,
    category: typeof payload.category === "string" ? payload.category.trim() : undefined,
    missionKind:
      typeof payload.missionKind === "string" ? payload.missionKind.trim() : undefined,
    missionProjectId:
      typeof payload.missionProjectId === "string"
        ? payload.missionProjectId.trim()
        : undefined,
  };
}

function mapActivityRecord(record: ReturnType<typeof listApprovalActivityRecords>[number]) {
  return {
    proposalId: record.proposalId,
    title: record.title,
    summary: record.summary,
    decision: record.decision,
    decidedAt: record.decidedAt,
    actor: record.actor,
    source: record.source ?? null,
    category: record.category ?? null,
    missionKind: record.missionKind ?? null,
    recordedAt: record.recordedAt,
  };
}

function isDevEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim();
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  return nodeEnv !== "production" && vercelEnv !== "production";
}

async function handleObsidianProjectNoteWrite(req: VercelRequest, res: VercelResponse) {
  if (!isVaultConfigured()) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: "OBSIDIAN_VAULT_PATH is not configured",
    });
  }

  const body = (req.body ?? {}) as {
    relativePath?: unknown;
    content?: unknown;
    allowedPrefixes?: unknown;
  };

  const relativePath =
    typeof body.relativePath === "string" ? body.relativePath.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const allowedPrefixes = Array.isArray(body.allowedPrefixes)
    ? body.allowedPrefixes
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

  if (!relativePath || !content || allowedPrefixes.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "relativePath, content, and allowedPrefixes are required",
    });
  }

  try {
    const absolutePath = await writeScopedProjectNote({
      relativePath,
      content,
      allowedPrefixes,
    });
    return res.status(200).json({ ok: true, absolutePath, relativePath });
  } catch (error) {
    if (error instanceof ObsidianScopeWriteError) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    console.error("Failed to write scoped Obsidian project note", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to write note",
    });
  }
}

async function handleGithubPullRequests(req: VercelRequest, res: VercelResponse) {
  const raw = req.query?.repos;
  const repos =
    typeof raw === "string"
      ? raw
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

  if (repos.length === 0) {
    return res.status(400).json({ ok: false, error: "repos query required (comma-separated owner/name)" });
  }

  const result = await listOpenPullRequestsForRepos(repos);
  if (!result.ok) {
    return res.status(502).json({ ok: false, error: result.error });
  }

  return res.status(200).json({
    ok: true,
    pullRequests: result.pullRequests,
    authMode: result.authMode,
  });
}

/** Comment-only GitHub write — no merge/close. Requires allowedRepos gate. */
async function handleGithubPrComment(req: VercelRequest, res: VercelResponse) {
  const body = (req.body ?? {}) as {
    repo?: unknown;
    prNumber?: unknown;
    body?: unknown;
    allowedRepos?: unknown;
  };

  const repo = typeof body.repo === "string" ? body.repo.trim() : "";
  const prNumber =
    typeof body.prNumber === "number"
      ? body.prNumber
      : typeof body.prNumber === "string"
        ? Number(body.prNumber)
        : NaN;
  const commentBody = typeof body.body === "string" ? body.body : "";
  const allowedRepos = Array.isArray(body.allowedRepos)
    ? body.allowedRepos
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

  if (!repo || !Number.isFinite(prNumber) || !commentBody.trim() || allowedRepos.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "repo, prNumber, body, and allowedRepos are required",
    });
  }

  const result = await postScopedPullRequestComment({
    repo,
    prNumber,
    body: commentBody,
    allowedRepos,
  });

  if (!result.ok) {
    const status = /outside project GitHub scope|Invalid|empty|required to post/i.test(
      result.error,
    )
      ? 400
      : 502;
    return res.status(status).json({ ok: false, error: result.error });
  }

  return res.status(200).json({
    ok: true,
    commentUrl: result.commentUrl,
    commentId: result.commentId,
  });
}

async function handleOperationalReadiness(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json(buildOperationalReadinessSummary());
}

async function handleApprovalActivity(_req: VercelRequest, res: VercelResponse) {
  if (!isVaultConfigured()) {
    return res.status(200).json({ activity: [], vaultConfigured: false });
  }

  try {
    const activity = listApprovalActivityRecords().map(mapActivityRecord);
    return res.status(200).json({ activity, vaultConfigured: true });
  } catch (error) {
    console.error("Failed to list approval activity", error);
    return res.status(500).json({
      error: "Failed to list approval activity",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleSlackTest(_req: VercelRequest, res: VercelResponse) {
  if (!isDevEnvironment()) {
    return res.status(404).json({ error: "Not found" });
  }

  await governedLoopSlack("Chief governance test: Slack wiring is live.");
  return res.status(200).json({ ok: true });
}

async function handleDailyTurnover(_req: VercelRequest, res: VercelResponse) {
  try {
    const snapshot = await collectDailyTurnoverSnapshot();
    const message = formatDailyTurnoverSlackMessage(snapshot);
    const slackConfigured = Boolean(process.env.SLACK_WEBHOOK_URL?.trim());

    if (slackConfigured) {
      await governedLoopSlack(message);
    }

    return res.status(200).json({
      ok: true,
      generatedAt: snapshot.generatedAt,
      summary: snapshot,
      message,
      slack: {
        configured: slackConfigured,
        attempted: slackConfigured,
      },
    });
  } catch (error) {
    console.error("Failed to build daily turnover", error);
    return res.status(500).json({
      error: "Failed to build daily turnover",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleSlackNotify(req: VercelRequest, res: VercelResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const event = parseString(body.event);

  if (event === "approval_created") {
    const approvalId = parseString(body.approvalId);
    if (!approvalId) {
      return res.status(400).json({ error: "approvalId is required" });
    }

    const missionKind = parseString(body.missionKind);
    const missionProjectId = parseString(body.missionProjectId);

    if (!isGovernedChiefApproval({ proposalId: approvalId, missionKind })) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    scheduleGovernedApprovalCreatedSlack({
      approvalId,
      missionKind,
      missionProjectId,
    });
    return res.status(200).json({ ok: true });
  }

  if (event === "monitor_state") {
    const state = parseString(body.state);
    const probeId = parseString(body.probeId);
    if (!state || !probeId) {
      return res.status(400).json({ error: "state and probeId are required" });
    }

    const incidentId = parseString(body.incidentId);
    await governedLoopSlack(
      formatMonitorStateMessage({ state, probeId, incidentId }),
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unsupported event" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const view = parseView(req);

  if (req.method === "GET" && view === "activity") {
    return handleApprovalActivity(req, res);
  }

  if (req.method === "GET" && view === "operational-readiness") {
    return handleOperationalReadiness(req, res);
  }

  if (req.method === "GET" && view === "github-pull-requests") {
    return handleGithubPullRequests(req, res);
  }

  if (req.method === "POST" && view === "obsidian-project-note") {
    return handleObsidianProjectNoteWrite(req, res);
  }

  if (req.method === "POST" && view === "github-pr-comment") {
    return handleGithubPrComment(req, res);
  }

  if (req.method === "POST" && view === "slack-test") {
    return handleSlackTest(req, res);
  }

  if (req.method === "POST" && view === "slack-notify") {
    return handleSlackNotify(req, res);
  }

  if ((req.method === "POST" || req.method === "GET") && view === "daily-turnover") {
    return handleDailyTurnover(req, res);
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "GET") {
    try {
      const rows = await fetchChiefApprovalDecisions();
      return res.status(200).json({
        decisions: rows.map(mapDbChiefApprovalDecisionToClient),
      });
    } catch (error) {
      console.error("Failed to fetch chief approval decisions", error);
      return res.status(500).json({
        error: "Failed to fetch approval decisions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "POST") {
    const body = req.body as {
      proposalId?: unknown;
      status?: unknown;
      actor?: unknown;
    };

    if (typeof body?.proposalId !== "string" || !body.proposalId.trim()) {
      return res.status(400).json({ error: "proposalId is required" });
    }

    if (typeof body?.status !== "string" || !isChiefApprovalStatus(body.status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const proposalId = body.proposalId.trim();
    const actor = parseActor(body.actor);
    const activityPayload = parseActivityPayload(body as Record<string, unknown>);

    try {
      const { row, created } = await insertChiefApprovalDecision(
        proposalId,
        body.status,
        actor,
      );
      const decision = mapDbChiefApprovalDecisionToClient(row);

      if (!created) {
        return res.status(409).json({
          error: "Already decided",
          decision,
        });
      }

      let activity:
        | { recorded: true; vaultPath: string; obsidianDecisionPath: string }
        | { recorded: false; error: string }
        | undefined;

      if (activityPayload && isVaultConfigured()) {
        try {
          const paths = await recordApprovalDecisionActivity({
            proposalId,
            title: activityPayload.title,
            summary: activityPayload.summary,
            decision: body.status,
            decidedAt: decision.decidedAt,
            actor: decision.actor,
            source: activityPayload.source,
            category: activityPayload.category,
            missionKind: activityPayload.missionKind,
          });
          activity = { recorded: true, ...paths };
        } catch (activityError) {
          console.error("Failed to record approval activity", activityError);
          activity = {
            recorded: false,
            error:
              activityError instanceof Error
                ? activityError.message
                : "Failed to record approval activity",
          };
        }
      } else if (activityPayload && !isVaultConfigured()) {
        activity = {
          recorded: false,
          error: "Obsidian vault is not configured",
        };
      }

      scheduleGovernedApprovalUpdatedSlack({
        approvalId: proposalId,
        status: body.status,
        missionKind: activityPayload?.missionKind,
        missionProjectId: activityPayload?.missionProjectId,
      });

      return res.status(201).json({ decision, activity });
    } catch (error) {
      console.error("Failed to record chief approval decision", error);
      return res.status(500).json({
        error: "Failed to record approval decision",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
