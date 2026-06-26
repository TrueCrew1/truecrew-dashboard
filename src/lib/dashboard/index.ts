import type { MockData } from "@/data/mockData";
import { WorkflowStage, type Deploy, type Persona, type Task } from "@/types";
import {
  checklistProgress,
  customerHasOpenHighTicket,
  daysSince,
  failedGateLabels,
  formatAge,
  hasFailedRequiredGate,
  hoursSince,
  inFlightProductionDeploys,
  isBlockedTask,
  isGateBlockedTask,
  isOverdue,
  isRevenueCriticalTool,
  isWaitingBlockedTask,
  openHighRiskIncidents,
  openIncidents,
  personaLabel,
  priorityWeight,
  productionTools,
  revenueCriticalToolIds,
  revenueCriticalTools,
  taskTouchesRevenueCritical,
  withinDays,
} from "./helpers";
import type {
  ActionQueueItem,
  AtRiskRow,
  CapacityRow,
  CapacityStatus,
  ExecutiveDashboardModel,
  KpiStatus,
  KpiTile,
  OnboardingRow,
  OpsDeployRow,
  OpsIncidentRow,
  OpsServiceRow,
  Posture,
  PostureLevel,
  RevenueSegment,
  TrendCard,
  TrendDirection,
} from "./types";

function postureLevel(level: PostureLevel, reason: string, entityId?: string): Posture {
  return { level, reason, entityId };
}

function computePosture(data: MockData, capacity: CapacityRow[]): Posture {
  const openRisk = openHighRiskIncidents(data);
  const sev1 = openRisk.find((inc) => inc.severity === 1);
  if (sev1) {
    return postureLevel("red", `Sev 1 — ${sev1.title}`, sev1.id);
  }

  const sev2Stale = openRisk.find(
    (inc) => inc.severity === 2 && hoursSince(inc.openedAt) > 4 && inc.status !== "mitigating",
  );
  if (sev2Stale) {
    return postureLevel("red", `Sev 2 — ${sev2Stale.serviceName}`, sev2Stale.id);
  }

  const revenueDown = revenueCriticalTools(data).find((tool) => tool.status === "down");
  if (revenueDown) {
    return postureLevel("red", `Revenue-critical service down — ${revenueDown.name}`, revenueDown.id);
  }

  const enterpriseAtRisk = data.customers.find(
    (c) => c.status === "active" && c.tier === "enterprise" && c.healthScore < 60,
  );
  if (enterpriseAtRisk) {
    return postureLevel(
      "red",
      `Enterprise account at risk — ${enterpriseAtRisk.name} health ${enterpriseAtRisk.healthScore}`,
      enterpriseAtRisk.id,
    );
  }

  const criticalOverdue = data.tasks.find(
    (task) =>
      task.workflowType === "decision" &&
      task.priority === "critical" &&
      task.stage === WorkflowStage.Review &&
      isOverdue(task),
  );
  if (criticalOverdue) {
    return postureLevel("red", `Critical decision overdue — ${criticalOverdue.title}`, criticalOverdue.id);
  }

  const sev2Mitigating = openRisk.find((inc) => inc.severity === 2);
  if (sev2Mitigating) {
    return postureLevel(
      "amber",
      `Sev 2 mitigating — ${sev2Mitigating.serviceName}`,
      sev2Mitigating.id,
    );
  }

  const sev3Stale = openIncidents(data).find(
    (inc) => inc.severity === 3 && hoursSince(inc.openedAt) > 24,
  );
  if (sev3Stale) {
    return postureLevel("amber", `Sev 3 open — ${sev3Stale.serviceName}`, sev3Stale.id);
  }

  const revenueDegraded = revenueCriticalTools(data).find((tool) => tool.status === "degraded");
  if (revenueDegraded) {
    return postureLevel("amber", `Revenue-critical degraded — ${revenueDegraded.name}`, revenueDegraded.id);
  }

  const blockedDeploy = inFlightProductionDeploys(data).find((deploy) => {
    const tool = data.tools.find((t) => t.id === deploy.serviceId);
    return tool != null && isRevenueCriticalTool(data, tool.id) && hoursSince(deploy.updatedAt) > 24;
  });
  if (blockedDeploy) {
    return postureLevel("amber", `Deploy blocked — ${blockedDeploy.title}`, blockedDeploy.id);
  }

  const stalledOnboarding = data.customers.find((customer) => {
    if (customer.status !== "onboarding") return false;
    const task = data.tasks.find(
      (t) =>
        t.linkedEntities.some((ref) => ref.id === customer.id) &&
        t.stage === WorkflowStage.Waiting,
    );
    const { done, total } = checklistProgress(customer);
    return total > done && task != null && daysSince(task.updatedAt) > 3;
  });
  if (stalledOnboarding) {
    return postureLevel(
      "amber",
      `Onboarding stalled — ${stalledOnboarding.name}`,
      stalledOnboarding.id,
    );
  }

  const gateBlockedCount = data.tasks.filter(isGateBlockedTask).length;
  if (gateBlockedCount > 3) {
    return postureLevel("amber", `${gateBlockedCount} gate-blocked items`);
  }

  const anyoneAvailable = capacity.some((row) => row.status === "available");
  if (!anyoneAvailable) {
    return postureLevel("amber", "No available capacity — all personas loaded or blocked");
  }

  const availableCount = capacity.filter((row) => row.status === "available").length;
  return postureLevel(
    "green",
    availableCount > 0
      ? `All systems steady · ${availableCount} persona${availableCount > 1 ? "s" : ""} available`
      : "All systems steady",
  );
}

function revenuePathBlockers(data: MockData): { count: number; context: string; entityId?: string } {
  const blockers: { label: string; entityId: string; updatedAt: string }[] = [];

  for (const deploy of inFlightProductionDeploys(data)) {
    if (!revenueCriticalToolIds(data).has(deploy.serviceId)) continue;
    blockers.push({
      label: `Deploy blocked · ${deployBlocker(data, deploy)}`,
      entityId: deploy.id,
      updatedAt: deploy.updatedAt,
    });
  }

  for (const task of data.tasks) {
    if (
      ![WorkflowStage.InProgress, WorkflowStage.Review].includes(task.stage) ||
      !taskTouchesRevenueCritical(data, task) ||
      !hasFailedRequiredGate(task)
    ) {
      continue;
    }
    blockers.push({
      label: failedGateLabels(task)[0] ?? "Gate blocked",
      entityId: task.id,
      updatedAt: task.updatedAt,
    });
  }

  blockers.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  const top = blockers[0];
  return {
    count: blockers.length,
    context: top?.label ?? "No blockers",
    entityId: top?.entityId,
  };
}

function computeCapacity(data: MockData): CapacityRow[] {
  const personas: Persona[] = ["founder", "operator"];

  return personas.map((persona) => {
    const inProgress = data.tasks.filter(
      (task) => task.assignee === persona && task.stage === WorkflowStage.InProgress,
    ).length;
    const waitingBlocked = data.tasks.some(
      (task) => task.assignee === persona && isWaitingBlockedTask(task),
    );
    const sev12Owned = openHighRiskIncidents(data).filter((inc) => inc.createdBy === persona).length;

    let status: CapacityStatus = "available";
    if (waitingBlocked) status = "blocked";
    else if (inProgress >= 2 || sev12Owned > 0) status = "loaded";

    return { persona, label: personaLabel(persona), status };
  });
}


function computeKpis(data: MockData, capacity: CapacityRow[]): KpiTile[] {
  const openRisk = openHighRiskIncidents(data);
  const topRisk = openRisk.sort((a, b) => a.severity - b.severity)[0];
  const openRiskStatus: KpiStatus =
    openRisk.some((inc) => inc.severity === 1) ? "red" : openRisk.length > 0 ? "amber" : "green";

  const revenuePath = revenuePathBlockers(data);
  const revenueStatus: KpiStatus = revenuePath.count >= 2 ? "amber" : revenuePath.count > 0 ? "amber" : "green";

  const prodTools = productionTools(data);
  const healthyCount = prodTools.filter((tool) => tool.status === "healthy").length;
  const unhealthy = prodTools.filter((tool) => tool.status !== "healthy");
  const opsStatus: KpiStatus = unhealthy.some((tool) => tool.status === "down")
    ? "red"
    : unhealthy.length > 0
      ? "amber"
      : "green";

  const blockedTasks = data.tasks.filter(isBlockedTask);
  const topBlocked = blockedTasks.sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  )[0];
  const blockedStatus: KpiStatus =
    blockedTasks.length > 3 ? "amber" : blockedTasks.length > 0 ? "amber" : "green";

  const availableCount = capacity.filter((row) => row.status === "available").length;
  const capacityStatus: KpiStatus = availableCount === 0 ? "amber" : "green";
  const capacityContext = capacity
    .map((row) => `${row.label} ${row.status}`)
    .join(" · ");

  return [
    {
      id: "open-risk",
      label: "Open risk",
      value: String(openRisk.length),
      status: openRiskStatus,
      context: topRisk ? `Sev ${topRisk.severity} · ${topRisk.serviceName}` : "No Sev 1–2",
      entityId: topRisk?.id,
    },
    {
      id: "revenue-path",
      label: "Revenue path",
      value: String(revenuePath.count),
      status: revenueStatus,
      context: revenuePath.context,
      entityId: revenuePath.entityId,
    },
    {
      id: "ops-health",
      label: "Ops health",
      value: `${healthyCount}/${prodTools.length}`,
      status: opsStatus,
      context:
        unhealthy.length > 0
          ? unhealthy
              .slice(0, 2)
              .map((tool) => tool.name.split(" ")[0])
              .join(" · ") + (unhealthy.length > 2 ? ` +${unhealthy.length - 2}` : "")
          : `${prodTools.length}/${prodTools.length} healthy`,
      entityId: unhealthy[0]?.id,
    },
    {
      id: "blocked",
      label: "Blocked",
      value: String(blockedTasks.length),
      status: blockedStatus,
      context: topBlocked?.blocker ?? failedGateLabels(topBlocked ?? ({} as Task))[0] ?? "None",
      entityId: topBlocked?.id,
    },
    {
      id: "available",
      label: "Available",
      value: `${availableCount}/${capacity.length}`,
      status: capacityStatus,
      context: capacityContext,
    },
  ];
}

function deployBlocker(data: MockData, deploy: Deploy): string {
  const buildWorkflow = data.workflows.find((wf) => wf.linkedEntityIds.some((ref) => ref.id === deploy.id));
  const failedGate = buildWorkflow?.gates.find((gate) => gate.required && !gate.passed);
  if (failedGate) return failedGate.label;
  const sourceTask = data.tasks.find((task) => task.linkedEntities.some((ref) => ref.id === deploy.id));
  const taskGate = sourceTask ? failedGateLabels(sourceTask)[0] : undefined;
  return taskGate ?? "Source build not Done";
}

function buildActionQueue(data: MockData): ActionQueueItem[] {
  const items: ActionQueueItem[] = [];

  for (const incident of openHighRiskIncidents(data)) {
    const repair = data.workflows.find((wf) => wf.linkedEntityIds.some((ref) => ref.id === incident.id));
    const failedGate = repair ? failedGateLabels(data.tasks.find((t) => repair.linkedTaskIds.includes(t.id)) ?? ({ gates: repair.gates } as Task))[0] : undefined;
    items.push({
      id: `queue-inc-${incident.id}`,
      entityId: incident.id,
      tier: 0,
      pill: `Sev ${incident.severity}`,
      title: incident.title,
      owner: incident.createdBy,
      age: formatAge(incident.openedAt),
      reason: failedGate ? `${failedGate}` : `${incident.status} — ${incident.serviceName}`,
      revenueImpact: revenueCriticalToolIds(data).has(incident.serviceId),
      sortSeverity: incident.severity,
      updatedAt: incident.updatedAt,
    });
  }

  for (const task of data.tasks) {
    if (task.workflowType === "decision" && task.priority === "critical" && task.stage === WorkflowStage.Review) {
      items.push({
        id: `queue-task-${task.id}`,
        entityId: task.id,
        tier: 1,
        pill: "Critical",
        title: task.title,
        owner: task.assignee ?? task.createdBy,
        age: formatAge(task.updatedAt),
        reason: failedGateLabels(task)[0] ?? "Decision gate open",
        revenueImpact: false,
        sortSeverity: 0,
        updatedAt: task.updatedAt,
        dueAt: task.dueAt,
      });
    }
  }

  for (const deploy of inFlightProductionDeploys(data)) {
    if (!revenueCriticalToolIds(data).has(deploy.serviceId)) continue;
    items.push({
      id: `queue-deploy-${deploy.id}`,
      entityId: deploy.id,
      tier: 2,
      pill: "Deploy",
      title: deploy.title,
      owner: deploy.createdBy,
      age: formatAge(deploy.updatedAt),
      reason: deployBlocker(data, deploy),
      revenueImpact: true,
      sortSeverity: 0,
      updatedAt: deploy.updatedAt,
    });
  }

  for (const task of data.tasks) {
    if (
      task.workflowType === "build" &&
      taskTouchesRevenueCritical(data, task) &&
      hasFailedRequiredGate(task) &&
      ![WorkflowStage.Done, WorkflowStage.Logged].includes(task.stage)
    ) {
      if (items.some((item) => item.entityId === task.id)) continue;
      items.push({
        id: `queue-task-${task.id}`,
        entityId: task.id,
        tier: 2,
        pill: "Build",
        title: task.title,
        owner: task.assignee ?? task.createdBy,
        age: formatAge(task.updatedAt),
        reason: failedGateLabels(task)[0] ?? "Build gate open",
        revenueImpact: true,
        sortSeverity: 0,
        updatedAt: task.updatedAt,
      });
    }
  }

  for (const customer of data.customers) {
    if (customer.tier !== "enterprise" || customer.status !== "onboarding") continue;
    const task = data.tasks.find(
      (t) =>
        t.linkedEntities.some((ref) => ref.id === customer.id) &&
        t.stage === WorkflowStage.Waiting,
    );
    const { done, total } = checklistProgress(customer);
    if (!task || total <= done || daysSince(task.updatedAt) <= 2) continue;
    items.push({
      id: `queue-cust-${customer.id}`,
      entityId: customer.id,
      tier: 3,
      pill: "Enterprise",
      title: `${customer.name} onboarding`,
      owner: task.assignee ?? task.createdBy,
      age: formatAge(task.updatedAt),
      reason: task.blocker ?? "Onboarding checklist incomplete",
      revenueImpact: true,
      sortSeverity: 0,
      updatedAt: task.updatedAt,
    });
  }

  for (const task of data.tasks) {
    if (
      task.priority !== "high" ||
      ![WorkflowStage.InProgress, WorkflowStage.Review].includes(task.stage) ||
      !hasFailedRequiredGate(task)
    ) {
      continue;
    }
    if (items.some((item) => item.entityId === task.id)) continue;
    items.push({
      id: `queue-task-${task.id}`,
      entityId: task.id,
      tier: 4,
      pill: "High",
      title: task.title,
      owner: task.assignee ?? task.createdBy,
      age: formatAge(task.updatedAt),
      reason: failedGateLabels(task)[0] ?? "Gate blocked",
      revenueImpact: taskTouchesRevenueCritical(data, task),
      sortSeverity: priorityWeight(task.priority),
      updatedAt: task.updatedAt,
    });
  }

  for (const task of data.tasks) {
    if (
      ![WorkflowStage.Triage, WorkflowStage.Inbox].includes(task.stage) ||
      !["high", "critical"].includes(task.priority)
    ) {
      continue;
    }
    const linkedCustomer = task.linkedEntities.find((ref) => ref.type === "customer");
    if (!linkedCustomer) continue;
    const customer = data.customers.find((c) => c.id === linkedCustomer.id);
    if (!customer || customer.status !== "active") continue;
    if (items.some((item) => item.entityId === task.id)) continue;
    items.push({
      id: `queue-task-${task.id}`,
      entityId: task.id,
      tier: 5,
      pill: task.priority === "critical" ? "Critical" : "High",
      title: task.title,
      owner: task.assignee ?? task.createdBy,
      age: formatAge(task.updatedAt),
      reason: failedGateLabels(task)[0] ?? "Customer ticket",
      revenueImpact: false,
      sortSeverity: priorityWeight(task.priority),
      updatedAt: task.updatedAt,
    });
  }

  items.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.sortSeverity !== b.sortSeverity) return a.sortSeverity - b.sortSeverity;
    if (a.revenueImpact !== b.revenueImpact) return a.revenueImpact ? -1 : 1;
    const ageDiff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    if (ageDiff !== 0) return ageDiff;
    if (a.dueAt && b.dueAt) {
      const aOver = isOverdue({ dueAt: a.dueAt } as Task);
      const bOver = isOverdue({ dueAt: b.dueAt } as Task);
      if (aOver !== bOver) return aOver ? -1 : 1;
    }
    return 0;
  });

  return items.slice(0, 7);
}

function computeOps(data: MockData): ExecutiveDashboardModel["ops"] {
  const services: OpsServiceRow[] = productionTools(data).map((tool) => ({
    id: tool.id,
    name: tool.name,
    status: tool.status,
    incidentCount: tool.openIncidentIds.length,
  }));

  const incidents: OpsIncidentRow[] = openIncidents(data)
    .sort((a, b) => a.severity - b.severity || new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
    .slice(0, 3)
    .map((inc) => ({
      id: inc.id,
      title: inc.title,
      severity: inc.severity,
      status: inc.status,
      serviceName: inc.serviceName,
    }));

  const deploys: OpsDeployRow[] = inFlightProductionDeploys(data).map((deploy) => ({
    id: deploy.id,
    title: deploy.title,
    stage: deploy.stage,
    blocker: deployBlocker(data, deploy),
  }));

  return { services, incidents, deploys };
}

function computeRevenue(data: MockData): ExecutiveDashboardModel["revenue"] {
  const active = data.customers.filter((c) => c.status === "active");
  const onboarding = data.customers.filter((c) => c.status === "onboarding");

  const segments: RevenueSegment[] = [
    {
      label: "Active",
      count: active.length,
      note: `${active.filter((c) => c.tier === "enterprise").length} enterprise`,
    },
    {
      label: "Onboarding",
      count: onboarding.length,
    },
    {
      label: "At-risk",
      count: active.filter((c) => c.healthScore < 70 || customerHasOpenHighTicket(data, c)).length,
    },
  ];

  const onboardingRows: OnboardingRow[] = onboarding.map((customer) => {
    const { done, total } = checklistProgress(customer);
    return {
      id: customer.id,
      name: customer.name,
      checklistDone: done,
      checklistTotal: total,
    };
  });

  const atRisk: AtRiskRow[] = active
    .filter((c) => c.healthScore < 70 || customerHasOpenHighTicket(data, c))
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      healthScore: customer.healthScore,
      reason:
        customer.healthScore < 70
          ? `Health ${customer.healthScore}`
          : "Open high-priority ticket",
    }));

  const enterpriseCustomer = onboarding.find((c) => c.tier === "enterprise");
  const enterpriseTask = enterpriseCustomer
    ? data.tasks.find(
        (t) =>
          t.linkedEntities.some((ref) => ref.id === enterpriseCustomer.id) &&
          isWaitingBlockedTask(t),
      )
    : undefined;

  const enterpriseBlocker =
    enterpriseCustomer && enterpriseTask
      ? `${enterpriseCustomer.name} — ${enterpriseTask.blocker ?? "checklist incomplete"}`
      : undefined;

  return {
    segments,
    onboarding: onboardingRows,
    atRisk,
    enterpriseBlocker,
  };
}

function trendDirection(delta: number): TrendDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function formatTrendDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return String(delta);
  return "→";
}

function computeTrends(data: MockData): TrendCard[] {
  const sev12Now = openHighRiskIncidents(data).length;
  const sev12Recent = openHighRiskIncidents(data).filter((inc) => withinDays(inc.openedAt, 7)).length;
  const sev12HasHistory = data.incidents.some((inc) => daysSince(inc.createdAt) > 7);
  const sev12Delta = sev12HasHistory ? sev12Recent : 0;

  const gateBlockedNow = data.tasks.filter(isGateBlockedTask).length;
  const gateBlockedRecent = data.tasks.filter(
    (task) => isGateBlockedTask(task) && withinDays(task.updatedAt, 7),
  ).length;
  const gateHasHistory = data.tasks.some((task) => daysSince(task.createdAt) > 7);
  const gateDelta = gateHasHistory ? gateBlockedRecent : 0;

  const activeCustomers = data.customers.filter((c) => c.status === "active");
  const avgHealth =
    activeCustomers.length > 0
      ? Math.round(
          activeCustomers.reduce((sum, c) => sum + c.healthScore, 0) / activeCustomers.length,
        )
      : 0;
  const healthHasHistory = activeCustomers.some((c) => daysSince(c.updatedAt) > 7);
  const healthDelta = healthHasHistory ? -3 : 0;

  const deploysNow = data.deploys.filter(
    (deploy) =>
      deploy.environment === "production" &&
      deploy.stage === WorkflowStage.Logged &&
      deploy.healthCheckPassed,
  ).length;
  const deployHasHistory = data.deploys.some((deploy) => daysSince(deploy.createdAt) > 7);
  const deployDelta = 0;

  return [
    {
      id: "sev12",
      label: "Sev 1–2 open",
      now: String(sev12Now),
      delta: sev12HasHistory ? formatTrendDelta(sev12Delta) : "—",
      direction: sev12HasHistory ? trendDirection(sev12Delta) : "flat",
      baselineBuilding: !sev12HasHistory,
    },
    {
      id: "gate-blocked",
      label: "Gate-blocked",
      now: String(gateBlockedNow),
      delta: gateHasHistory ? formatTrendDelta(gateDelta) : "—",
      direction: gateHasHistory ? trendDirection(gateDelta) : "flat",
      baselineBuilding: !gateHasHistory,
    },
    {
      id: "avg-health",
      label: "Avg customer health",
      now: activeCustomers.length > 0 ? String(avgHealth) : "—",
      delta: healthHasHistory ? formatTrendDelta(healthDelta) : "—",
      direction: healthHasHistory ? trendDirection(healthDelta) : "flat",
      baselineBuilding: !healthHasHistory,
    },
    {
      id: "prod-deploys",
      label: "Production deploys",
      now: String(deploysNow),
      delta: deployHasHistory ? formatTrendDelta(deployDelta) : "—",
      direction: "flat",
      baselineBuilding: !deployHasHistory,
    },
  ];
}

export function buildExecutiveDashboard(data: MockData): ExecutiveDashboardModel {
  const capacity = computeCapacity(data);
  const posture = computePosture(data, capacity);

  return {
    posture,
    kpis: computeKpis(data, capacity),
    actionQueue: buildActionQueue(data),
    ops: computeOps(data),
    revenue: computeRevenue(data),
    capacity,
    trends: computeTrends(data),
    drillEntityId: posture.entityId,
  };
}
