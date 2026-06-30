import type { DbTaskRow } from "../supabase/admin.js";
import { enrichTaskCustomerLinks } from "../task-context.js";
import { mapDbTaskToClient, type ClientTask } from "./tasks.js";

type Row = Record<string, unknown>;

function id(row: Row): string {
  return String(row.legacy_id ?? row.id);
}

export function mapCommandCenterData(raw: Awaited<ReturnType<typeof import("../supabase/queries").fetchRawCommandCenterRows>>) {
  const tasks = (raw.tasks as DbTaskRow[]).map(mapDbTaskToClient) as ClientTask[];

  const taskByUuid = new Map(
    (raw.tasks as Row[]).map((row) => [String(row.id), id(row)]),
  );

  const taskGatesByLegacyId = new Map(tasks.map((task) => [task.id, task.gates]));

  const workflowTaskLinks = raw.workflowTasks as Row[];
  const workflowToTaskIds = new Map<string, string[]>();
  for (const link of workflowTaskLinks) {
    const wfLegacy = (raw.workflows as Row[]).find((w) => w.id === link.workflow_id);
    const taskLegacy = taskByUuid.get(String(link.task_id));
    if (!wfLegacy || !taskLegacy) continue;
    const wfId = id(wfLegacy);
    const list = workflowToTaskIds.get(wfId) ?? [];
    list.push(taskLegacy);
    workflowToTaskIds.set(wfId, list);
  }

  const workflows = (raw.workflows as Row[]).map((row) => {
    const wfId = id(row);
    const linkedTaskIds = workflowToTaskIds.get(wfId) ?? [];
    const gates =
      linkedTaskIds.length > 0
        ? (taskGatesByLegacyId.get(linkedTaskIds[0]) ?? [])
        : [];

    return {
      id: wfId,
      title: String(row.title),
      type: String(row.type),
      stage: String(row.stage),
      owner: String(row.owner),
      summary: String(row.summary ?? ""),
      gates,
      linkedTaskIds,
      linkedEntityIds: [],
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });

  const toolUuidToLegacy = new Map(
    (raw.tools as Row[]).map((row) => [String(row.id), id(row)]),
  );

  const incidents = (raw.incidents as Row[]).map((row) => {
    const linkedRepair = (raw.workflows as Row[]).find((w) => w.id === row.linked_repair_id);
    return {
      id: id(row),
      title: String(row.title),
      severity: Number(row.severity) as 1 | 2 | 3 | 4,
      status: String(row.status),
      serviceId: row.service_id ? toolUuidToLegacy.get(String(row.service_id)) ?? String(row.service_id) : "",
      serviceName: String(row.service_name),
      summary: String(row.summary ?? ""),
      openedAt: String(row.opened_at),
      mitigatedAt: row.mitigated_at ? String(row.mitigated_at) : undefined,
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
      linkedRepairId: linkedRepair ? id(linkedRepair) : undefined,
      runbookId: row.runbook_id ? String(row.runbook_id) : undefined,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });

  const openIncidentsByToolUuid = new Map<string, string[]>();
  for (const row of raw.incidents as Row[]) {
    if (!row.service_id || row.status === "resolved" || row.status === "post_mortem_filed") continue;
    const key = String(row.service_id);
    const list = openIncidentsByToolUuid.get(key) ?? [];
    list.push(id(row));
    openIncidentsByToolUuid.set(key, list);
  }

  const tools = (raw.tools as Row[]).map((row) => ({
    id: id(row),
    name: String(row.name),
    slug: String(row.slug),
    category: String(row.category),
    status: String(row.status),
    environment: String(row.environment),
    owner: String(row.owner),
    url: row.url ? String(row.url) : undefined,
    healthCheckUrl: row.health_check_url ? String(row.health_check_url) : undefined,
    githubRepo: row.github_repo ? String(row.github_repo) : undefined,
    deployMethod: String(row.deploy_method),
    currentVersion: row.current_version ? String(row.current_version) : undefined,
    lastDeployedAt: row.last_deployed_at ? String(row.last_deployed_at) : undefined,
    lastDeployId: row.last_deploy_id ? String(row.last_deploy_id) : undefined,
    runbookId: row.runbook_id ? String(row.runbook_id) : undefined,
    openIncidentIds: openIncidentsByToolUuid.get(String(row.id)) ?? [],
    tags: (row.tags as string[]) ?? [],
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const workflowUuidToLegacy = new Map(
    (raw.workflows as Row[]).map((row) => [String(row.id), id(row)]),
  );

  const deploys = (raw.deploys as Row[]).map((row) => ({
    id: id(row),
    title: String(row.title),
    stage: String(row.stage),
    buildId: row.build_id ? workflowUuidToLegacy.get(String(row.build_id)) ?? String(row.build_id) : "",
    buildTitle: String(row.build_title ?? ""),
    serviceId: row.service_id ? toolUuidToLegacy.get(String(row.service_id)) ?? "" : "",
    serviceName: String(row.service_name),
    environment: String(row.environment),
    version: String(row.version),
    githubRef: row.github_ref ? String(row.github_ref) : "",
    rollbackPlan: String(row.rollback_plan ?? ""),
    deployedAt: row.deployed_at ? String(row.deployed_at) : undefined,
    healthCheckPassed:
      row.health_check_passed === null || row.health_check_passed === undefined
        ? undefined
        : Boolean(row.health_check_passed),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const checklistByCustomer = new Map<string, Row[]>();
  for (const item of raw.checklist as Row[]) {
    const list = checklistByCustomer.get(String(item.customer_id)) ?? [];
    list.push(item);
    checklistByCustomer.set(String(item.customer_id), list);
  }

  const customers = (raw.customers as Row[]).map((row) => ({
    id: id(row),
    name: String(row.name),
    slug: String(row.slug),
    tier: String(row.tier),
    stage: String(row.stage),
    primaryContact: String(row.primary_contact),
    email: String(row.email),
    healthScore: Number(row.health_score),
    status: String(row.status),
    linkedTicketIds: [],
    onboardingChecklist: (checklistByCustomer.get(String(row.id)) ?? []).map((item) => ({
      id: String(item.gate_key),
      label: String(item.label),
      required: Boolean(item.required),
      passed: Boolean(item.passed),
    })),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const runbooks = (raw.runbooks as Row[]).map((row) => ({
    id: id(row),
    title: String(row.title),
    serviceId: row.service_id ? toolUuidToLegacy.get(String(row.service_id)) ?? "" : "",
    serviceName: String(row.service_name),
    obsidianPath: String(row.obsidian_path),
    summary: String(row.summary ?? ""),
    lastReviewedAt: row.last_reviewed_at ? String(row.last_reviewed_at) : undefined,
    tags: (row.tags as string[]) ?? [],
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const prompts = (raw.prompts as Row[]).map((row) => ({
    id: id(row),
    title: String(row.title),
    category: String(row.category),
    version: String(row.version),
    content: String(row.content),
    tags: (row.tags as string[]) ?? [],
    linkedWorkflowTypes: (row.linked_workflow_types as string[]) ?? [],
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const notes = (raw.notes as Row[]).map((row) => ({
    id: id(row),
    title: String(row.title),
    type: String(row.type),
    obsidianPath: String(row.obsidian_path),
    summary: String(row.summary ?? ""),
    sourceTaskId: row.source_task_id ? String(row.source_task_id) : undefined,
    syncedAt: String(row.synced_at),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const linked = enrichTaskCustomerLinks(tasks, customers);

  const focusItems = buildFocusItems(linked.tasks, incidents);
  const alerts = buildAlerts(linked.tasks, incidents, deploys, linked.customers);

  return {
    tasks: linked.tasks,
    workflows,
    incidents,
    tools,
    deploys,
    customers: linked.customers,
    runbooks,
    prompts,
    notes,
    focusItems,
    alerts,
  };
}

function buildFocusItems(
  tasks: ClientTask[],
  incidents: { id: string; title: string; severity: number; linkedRepairId?: string }[],
) {
  const items = [];

  const sev2 = incidents.find((i) => i.severity <= 2 && i.linkedRepairId);
  if (sev2) {
    items.push({
      id: `focus-${sev2.id}`,
      taskId: sev2.linkedRepairId!,
      title: sev2.title,
      stage: "In Progress",
      workflowType: "repair",
      reason: `Sev ${sev2.severity} incident — active mitigation required`,
    });
  }

  const decision = tasks.find((t) => t.workflowType === "decision" && t.stage === "Review");
  if (decision) {
    items.push({
      id: `focus-${decision.id}`,
      taskId: decision.id,
      title: decision.title,
      stage: decision.stage,
      workflowType: decision.workflowType,
      reason: "Decision pending — blocks Q3 roadmap planning",
    });
  }

  const build = tasks.find(
    (t) =>
      t.workflowType === "build" &&
      t.stage === "In Progress" &&
      t.gates.some((g) => g.required && !g.passed),
  );
  if (build) {
    items.push({
      id: `focus-${build.id}`,
      taskId: build.id,
      title: build.title,
      stage: build.stage,
      workflowType: build.workflowType,
      reason: "Open gate blocking deploy",
    });
  }

  return items.slice(0, 3);
}

function buildAlerts(
  tasks: ClientTask[],
  incidents: { id: string; title: string; severity: number; serviceName: string; openedAt: string }[],
  deploys: { id: string; title: string; stage: string; serviceName: string }[],
  customers: { id: string; name: string; stage: string }[],
) {
  const alerts = [];

  for (const inc of incidents.filter((i) => i.severity <= 2)) {
    alerts.push({
      id: `alert-${inc.id}`,
      type: "incident" as const,
      severity: inc.severity as 1 | 2,
      title: inc.title,
      message: `Sev ${inc.severity} — ${inc.serviceName}`,
      timestamp: inc.openedAt,
      entityRef: { type: "incident" as const, id: inc.id, label: inc.title },
    });
  }

  const blockedDeploy = deploys.find((d) => d.stage === "Planned");
  if (blockedDeploy) {
    alerts.push({
      id: `alert-${blockedDeploy.id}`,
      type: "deploy" as const,
      severity: "info" as const,
      title: "Deploy blocked",
      message: `${blockedDeploy.serviceName} deploy waiting on build gates`,
      timestamp: new Date().toISOString(),
      entityRef: { type: "deploy" as const, id: blockedDeploy.id, label: blockedDeploy.title },
    });
  }

  const waitingCustomer = customers.find((c) => c.stage === "Waiting");
  if (waitingCustomer) {
    alerts.push({
      id: `alert-${waitingCustomer.id}`,
      type: "waiting" as const,
      severity: "info" as const,
      title: "Onboarding stalled",
      message: `${waitingCustomer.name} waiting on external dependency`,
      timestamp: new Date().toISOString(),
      entityRef: { type: "customer" as const, id: waitingCustomer.id, label: waitingCustomer.name },
    });
  }

  const blockedTask = tasks.find((t) => t.gates.some((g) => g.required && !g.passed));
  if (blockedTask) {
    alerts.push({
      id: `alert-gate-${blockedTask.id}`,
      type: "gate_block" as const,
      severity: "info" as const,
      title: "Gate blocked",
      message: `${blockedTask.title} has open required gates`,
      timestamp: new Date().toISOString(),
      entityRef: { type: "task" as const, id: blockedTask.id, label: blockedTask.title },
    });
  }

  return alerts.slice(0, 5);
}
