import { renderPlanningNote } from "../obsidian/templates.js";
import { logPlanning } from "../obsidian/log.js";
import { isVaultConfigured } from "../obsidian/config.js";
import type { RuntimePassRecord, RuntimeRequestedBy } from "../runtime/types.js";
import { validatePlannerInputPayload } from "./validate-payload.js";
import {
  claimNextQueuedPlannerWorkItem,
  finishRuntimeExecutionJob,
  hashContent,
  insertRuntimeArtifact,
  insertRuntimeExecutionJob,
  insertRuntimeSinkDelivery,
  updateRuntimeWorkItemStatus,
  upsertNotesIndexRow,
} from "../supabase/runtime-queries.js";
import { getChiefApprovalDecision, insertPlannerApprovedTask } from "../supabase/queries.js";
import { writeAuditEvent } from "../supabase/admin.js";

const RUNNER_ID = "local-cli-v1";

function toTaskCreatedBy(requestedBy: RuntimeRequestedBy): "founder" | "operator" | "observer" {
  return requestedBy === "founder" || requestedBy === "observer" ? requestedBy : "operator";
}

export interface PlannerPipelineResult {
  workItemId: string;
  executionJobId: string;
  obsidianPath: string;
  noteId: string;
  taskId: string | null;
}

export async function processNextPlannerWorkItem(): Promise<PlannerPipelineResult | null> {
  if (!isVaultConfigured()) {
    throw new Error("OBSIDIAN_VAULT_PATH is not configured");
  }

  const workItem = await claimNextQueuedPlannerWorkItem();
  if (!workItem) return null;

  const passes: RuntimePassRecord[] = [];
  const job = await insertRuntimeExecutionJob(workItem.id, RUNNER_ID);

  try {
    passes.push({
      tier: 0,
      step: "validate_payload",
      outcome: "pass",
      at: new Date().toISOString(),
    });

    const payload = validatePlannerInputPayload(workItem.input_kind, workItem.input_payload);

    passes.push({
      tier: 0,
      step: "render_planning_template",
      outcome: "pass",
      at: new Date().toISOString(),
    });

    const rendered = renderPlanningNote({
      title: payload.title,
      description: payload.description,
      context: payload.context,
      notes: payload.notes,
      loggedAt: new Date(),
    });
    const contentHash = hashContent(rendered);

    const writeResult = await logPlanning({
      title: payload.title,
      description: payload.description,
      context: payload.context,
      notes: payload.notes,
      loggedAt: new Date(),
    });

    passes.push({
      tier: 0,
      step: "write_obsidian_note",
      outcome: writeResult.obsidianPath,
      at: new Date().toISOString(),
    });

    const obsidianArtifact = await insertRuntimeArtifact({
      executionJobId: job.id,
      artifactKind: "obsidian_note",
      uri: writeResult.obsidianPath,
      contentHash,
      metadata: { title: payload.title, type: "planning" },
    });

    await insertRuntimeSinkDelivery({
      artifactId: obsidianArtifact.id,
      sink: "obsidian",
      status: "delivered",
      details: { obsidianPath: writeResult.obsidianPath },
    });

    const summary = payload.context?.slice(0, 240) ?? payload.description.slice(0, 240);
    const noteRow = await upsertNotesIndexRow({
      title: payload.title,
      obsidianPath: writeResult.obsidianPath,
      summary,
      requestedBy: workItem.requested_by,
    });

    passes.push({
      tier: 0,
      step: "upsert_notes_index",
      outcome: noteRow.id,
      at: new Date().toISOString(),
    });

    const indexArtifact = await insertRuntimeArtifact({
      executionJobId: job.id,
      artifactKind: "index_row",
      uri: `supabase:notes:${noteRow.id}`,
      contentHash: hashContent(`${noteRow.id}:${writeResult.obsidianPath}`),
      metadata: { noteId: noteRow.id, created: noteRow.created },
    });

    await insertRuntimeSinkDelivery({
      artifactId: indexArtifact.id,
      sink: "supabase_notes",
      status: "delivered",
      details: { noteId: noteRow.id, obsidianPath: writeResult.obsidianPath },
    });

    // Bounded action: only mutates public.tasks when this work item's
    // chief_proposal_id resolves to an explicit "approved" decision.
    // Any other outcome (no proposal, pending, rejected, sent_back) skips
    // the action — the note-filing above already completed regardless.
    let taskId: string | null = null;
    if (workItem.chief_proposal_id) {
      const decision = await getChiefApprovalDecision(workItem.chief_proposal_id);
      if (decision?.status === "approved") {
        const task = await insertPlannerApprovedTask({
          title: payload.title,
          description: payload.description,
          createdBy: toTaskCreatedBy(workItem.requested_by),
        });
        taskId = task.id;

        passes.push({
          tier: 0,
          step: "create_approved_task",
          outcome: task.id,
          at: new Date().toISOString(),
        });

        await insertRuntimeArtifact({
          executionJobId: job.id,
          artifactKind: "index_row",
          uri: `supabase:tasks:${task.id}`,
          contentHash: hashContent(`${task.id}:${payload.title}`),
          metadata: {
            taskId: task.id,
            stage: "Planned",
            chiefProposalId: workItem.chief_proposal_id,
          },
        });

        try {
          await writeAuditEvent(
            "task",
            task.id,
            "planner.task.created_from_approval",
            { workItemId: workItem.id, chiefProposalId: workItem.chief_proposal_id },
            "planner_agent",
          );
        } catch {
          // Fail open per ADR-001
        }
      } else {
        passes.push({
          tier: 0,
          step: "create_approved_task",
          outcome: "skipped_not_approved",
          at: new Date().toISOString(),
        });
      }
    }

    await finishRuntimeExecutionJob(job.id, "succeeded", passes);
    await updateRuntimeWorkItemStatus(workItem.id, "completed");

    try {
      await writeAuditEvent(
        "runtime_work_item",
        workItem.id,
        "planner.work_item.completed",
        {
          executionJobId: job.id,
          obsidianPath: writeResult.obsidianPath,
          noteId: noteRow.id,
          taskId,
        },
        "planner_agent",
      );
    } catch {
      // Fail open per ADR-001
    }

    return {
      workItemId: workItem.id,
      executionJobId: job.id,
      obsidianPath: writeResult.obsidianPath,
      noteId: noteRow.id,
      taskId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown planner pipeline error";
    passes.push({
      tier: 0,
      step: "pipeline_error",
      outcome: message,
      at: new Date().toISOString(),
    });
    await finishRuntimeExecutionJob(job.id, "failed", passes, message);
    await updateRuntimeWorkItemStatus(workItem.id, "failed");
    throw error;
  }
}
