import { renderDecisionNote } from "../obsidian/templates.js";
import { logDecision } from "../obsidian/log.js";
import { isVaultConfigured } from "../obsidian/config.js";
import type { RuntimePassRecord } from "../runtime/types.js";
import { validateLibrarianInputPayload } from "./validate-payload.js";
import {
  claimNextQueuedLibrarianWorkItem,
  finishRuntimeExecutionJob,
  hashContent,
  insertRuntimeArtifact,
  insertRuntimeExecutionJob,
  insertRuntimeSinkDelivery,
  updateRuntimeWorkItemStatus,
  upsertNotesIndexRow,
} from "../supabase/runtime-queries.js";
import { writeAuditEvent } from "../supabase/admin.js";

const RUNNER_ID = "local-cli-v1";

export interface LibrarianPipelineResult {
  workItemId: string;
  executionJobId: string;
  obsidianPath: string;
  noteId: string;
}

export async function processNextLibrarianWorkItem(): Promise<LibrarianPipelineResult | null> {
  if (!isVaultConfigured()) {
    throw new Error("OBSIDIAN_VAULT_PATH is not configured");
  }

  const workItem = await claimNextQueuedLibrarianWorkItem();
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

    const payload = validateLibrarianInputPayload(workItem.input_kind, workItem.input_payload);

    passes.push({
      tier: 0,
      step: "render_decision_template",
      outcome: "pass",
      at: new Date().toISOString(),
    });

    const rendered = renderDecisionNote({
      title: payload.title,
      decision: payload.decision,
      context: payload.context,
      consequences: payload.consequences,
      loggedAt: new Date(),
    });
    const contentHash = hashContent(rendered);

    const writeResult = await logDecision({
      title: payload.title,
      decision: payload.decision,
      context: payload.context,
      consequences: payload.consequences,
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
      metadata: { title: payload.title, type: "decision" },
    });

    await insertRuntimeSinkDelivery({
      artifactId: obsidianArtifact.id,
      sink: "obsidian",
      status: "delivered",
      details: { obsidianPath: writeResult.obsidianPath },
    });

    const summary = payload.context?.slice(0, 240) ?? payload.decision.slice(0, 240);
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

    await finishRuntimeExecutionJob(job.id, "succeeded", passes);
    await updateRuntimeWorkItemStatus(workItem.id, "completed");

    try {
      await writeAuditEvent(
        "runtime_work_item",
        workItem.id,
        "librarian.work_item.completed",
        {
          executionJobId: job.id,
          obsidianPath: writeResult.obsidianPath,
          noteId: noteRow.id,
        },
        "librarian_agent",
      );
    } catch {
      // Fail open per ADR-001
    }

    return {
      workItemId: workItem.id,
      executionJobId: job.id,
      obsidianPath: writeResult.obsidianPath,
      noteId: noteRow.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown librarian pipeline error";
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
