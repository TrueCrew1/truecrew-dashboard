import { renderMaintenanceNote } from "../obsidian/templates.js";
import { logMaintenance } from "../obsidian/log.js";
import { isVaultConfigured } from "../obsidian/config.js";
import type { RuntimePassRecord } from "../runtime/types.js";
import { validateMaintenanceInputPayload } from "./validate-payload.js";
import {
  claimNextQueuedMaintenanceWorkItem,
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

export interface MaintenancePipelineResult {
  workItemId: string;
  executionJobId: string;
  obsidianPath: string;
  noteId: string;
}

export async function processNextMaintenanceWorkItem(): Promise<MaintenancePipelineResult | null> {
  if (!isVaultConfigured()) {
    throw new Error("OBSIDIAN_VAULT_PATH is not configured");
  }

  const workItem = await claimNextQueuedMaintenanceWorkItem();
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

    const payload = validateMaintenanceInputPayload(workItem.input_kind, workItem.input_payload);

    passes.push({
      tier: 0,
      step: "render_maintenance_template",
      outcome: "pass",
      at: new Date().toISOString(),
    });

    const rendered = renderMaintenanceNote({
      title: payload.title,
      description: payload.description,
      context: payload.context,
      notes: payload.notes,
      loggedAt: new Date(),
    });
    const contentHash = hashContent(rendered);

    const writeResult = await logMaintenance({
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
      metadata: { title: payload.title, type: "maintenance" },
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

    await finishRuntimeExecutionJob(job.id, "succeeded", passes);
    await updateRuntimeWorkItemStatus(workItem.id, "completed");

    try {
      await writeAuditEvent(
        "runtime_work_item",
        workItem.id,
        "maintenance.work_item.completed",
        {
          executionJobId: job.id,
          obsidianPath: writeResult.obsidianPath,
          noteId: noteRow.id,
        },
        "maintenance_agent",
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
    const message = error instanceof Error ? error.message : "Unknown maintenance pipeline error";
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
