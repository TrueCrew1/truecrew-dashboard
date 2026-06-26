import type { MockData } from "@/data/mockData";
import { WorkflowStage } from "@/types";
import {
  actionDrillTo,
  actionPill,
  formatAge,
  formatMoney,
  formatTime,
  formatTrendDelta,
  hoursSince,
  isDueTodayJob,
  isLowStock,
  isOpenJob,
  isOverdueJob,
  isPendingInvoice,
  isSameDay,
  isUnassignedJob,
  isUnpaidInvoice,
  trendDirection,
} from "./helpers";
import type {
  ActionQueueRow,
  DispatchRow,
  DispatchSummary,
  ExecutiveDashboardModel,
  KpiStatus,
  KpiTile,
  RevenueLane,
  RiskLane,
  RiskRow,
  TrendCard,
} from "./types";

function kpiStatus(value: number, amberAt: number, redAt: number): KpiStatus {
  if (value >= redAt) return "red";
  if (value >= amberAt) return "amber";
  return "green";
}

function computeKpis(data: MockData): KpiTile[] {
  const openJobs = data.jobs.filter(isOpenJob);
  const overdueJobs = data.jobs.filter(isOverdueJob);
  const unassignedJobs = data.jobs.filter(isUnassignedJob);
  const dueTodayJobs = data.jobs.filter(isDueTodayJob);
  const lowStock = data.inventory.filter(isLowStock);
  const pendingInvoices = data.invoices.filter(isPendingInvoice);

  return [
    {
      id: "open-jobs",
      label: "Open jobs",
      value: String(openJobs.length),
      status: kpiStatus(openJobs.length, 6, 10),
      context: `${openJobs.filter((j) => j.status === "in_progress").length} in progress`,
      drillTo: "/operations?filter=open",
    },
    {
      id: "overdue-jobs",
      label: "Overdue jobs",
      value: String(overdueJobs.length),
      status: kpiStatus(overdueJobs.length, 1, 3),
      context: overdueJobs[0]?.customerName ?? "None overdue",
      drillTo: "/operations?filter=overdue",
      entityId: overdueJobs[0]?.id,
    },
    {
      id: "unassigned-jobs",
      label: "Unassigned jobs",
      value: String(unassignedJobs.length),
      status: kpiStatus(unassignedJobs.length, 1, 2),
      context: unassignedJobs[0]?.title.slice(0, 32) ?? "All assigned",
      drillTo: "/operations?filter=unassigned",
      entityId: unassignedJobs[0]?.id,
    },
    {
      id: "due-today",
      label: "Jobs due today",
      value: String(dueTodayJobs.length),
      status: kpiStatus(dueTodayJobs.length, 4, 7),
      context: `${dueTodayJobs.filter((j) => j.status === "complete").length} complete today`,
      drillTo: "/operations?filter=due-today",
    },
    {
      id: "low-stock",
      label: "Low-stock items",
      value: String(lowStock.length),
      status: kpiStatus(lowStock.length, 2, 4),
      context: lowStock.slice(0, 2).map((i) => i.sku).join(" · ") || "Stock healthy",
      drillTo: "/builds?filter=inventory",
      entityId: lowStock[0]?.id,
    },
    {
      id: "invoices-pending",
      label: "Invoices pending",
      value: String(pendingInvoices.length),
      status: kpiStatus(pendingInvoices.length, 3, 6),
      context: `${pendingInvoices.filter((i) => i.status === "draft").length} draft · ${pendingInvoices.filter(isUnpaidInvoice).length} unpaid`,
      drillTo: "/customers?filter=invoices",
      entityId: pendingInvoices[0]?.id,
    },
  ];
}

function computeDispatch(data: MockData): DispatchSummary {
  const todayJobs = data.jobs.filter((job) => isSameDay(job.scheduledAt) && isOpenJob(job));
  const crewGaps = data.dispatch.filter((slot) => slot.gapReason).length;
  const delayedJobs = data.jobs.filter((job) => job.status === "delayed");

  const rows: DispatchRow[] = data.dispatch.map((slot) => {
    const job = slot.jobId ? data.jobs.find((j) => j.id === slot.jobId) : undefined;
    let status: DispatchRow["status"] = "scheduled";
    let detail = slot.crewName ?? slot.gapReason ?? "Open slot";
    let drillTo = "/operations?filter=dispatch";

    if (slot.gapReason && !slot.jobId) {
      status = "gap";
      detail = slot.gapReason;
    } else if (slot.gapReason && slot.jobId) {
      status = "unassigned";
      detail = slot.gapReason;
      drillTo = "/operations?filter=unassigned";
    } else if (job?.status === "delayed") {
      status = "delayed";
      detail = job.blocker ?? "Running behind schedule";
      drillTo = "/repair?filter=delayed";
    } else if (job) {
      detail = `${job.customerName} · ${job.assigneeName ?? "Unassigned"}`;
    }

    return {
      id: slot.id,
      time: `${formatTime(slot.startAt)}–${formatTime(slot.endAt)}`,
      label: job?.title ?? slot.label,
      detail,
      status,
      drillTo,
      entityId: job?.id,
    };
  });

  return {
    scheduledToday: todayJobs.length,
    crewGaps,
    delayedJobs: delayedJobs.length,
    rows,
  };
}

function computeActionQueue(data: MockData): ActionQueueRow[] {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return [...data.dashboardActions]
    .sort(
      (a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    )
    .slice(0, 7)
    .map((action) => ({
      id: action.id,
      pill: actionPill(action.type),
      title: action.title,
      reason: action.reason,
      age: formatAge(action.updatedAt),
      drillTo: actionDrillTo(action.type),
      entityId: action.entityId,
    }));
}

function computeRevenue(data: MockData): RevenueLane {
  const drafts = data.invoices.filter((inv) => inv.status === "draft");
  const sent = data.invoices.filter((inv) => inv.status === "sent");
  const unpaid = data.invoices.filter(isUnpaidInvoice);
  const unpaidTotal = unpaid.reduce((sum, inv) => sum + inv.amountCents, 0);

  return {
    draftCount: drafts.length,
    sentCount: sent.length,
    unpaidBalance: formatMoney(unpaidTotal),
    rows: [
      {
        id: "draft",
        label: "Draft invoices",
        count: drafts.length,
        amount: formatMoney(drafts.reduce((s, i) => s + i.amountCents, 0)),
        drillTo: "/customers?filter=draft-invoices",
      },
      {
        id: "sent",
        label: "Sent invoices",
        count: sent.length,
        amount: formatMoney(sent.reduce((s, i) => s + i.amountCents, 0)),
        drillTo: "/customers?filter=sent-invoices",
      },
      {
        id: "unpaid",
        label: "Unpaid balance",
        count: unpaid.length,
        amount: formatMoney(unpaidTotal),
        drillTo: "/customers?filter=unpaid",
      },
    ],
  };
}

function computeRisk(data: MockData): RiskLane {
  const blockedJobs = data.jobs.filter((job) => job.status === "blocked");
  const repeatJobs = data.jobs.filter((job) => job.repeatIssue && isOpenJob(job));
  const agingTickets = data.tasks.filter(
    (task) =>
      [WorkflowStage.Triage, WorkflowStage.Inbox].includes(task.stage) &&
      hoursSince(task.createdAt) > 72,
  );

  const rows: RiskRow[] = [
    ...blockedJobs.map((job) => ({
      id: job.id,
      title: job.title,
      detail: job.blocker ?? "Blocked",
      pill: "Blocked",
      drillTo: "/repair?filter=blocked",
      entityId: job.id,
    })),
    ...repeatJobs.map((job) => ({
      id: `repeat-${job.id}`,
      title: job.title,
      detail: "Repeat issue flagged",
      pill: "Repeat",
      drillTo: "/repair?filter=repeat",
      entityId: job.id,
    })),
    ...agingTickets.map((task) => ({
      id: task.id,
      title: task.title,
      detail: `Open ${formatAge(task.createdAt)} in ${task.stage}`,
      pill: "Aging",
      drillTo: "/operations?filter=aging",
      entityId: task.id,
    })),
  ].slice(0, 6);

  return {
    blockedCount: blockedJobs.length,
    repeatCount: repeatJobs.length,
    agingCount: agingTickets.length,
    rows,
  };
}

function computeTrends(data: MockData): TrendCard[] {
  const weekJobs = data.jobs.filter((job) => hoursSince(job.scheduledAt) <= 168);
  const completedWeek = weekJobs.filter((job) => job.status === "complete").length;
  const scheduledWeek = weekJobs.length;
  const completionRate =
    scheduledWeek > 0 ? Math.round((completedWeek / scheduledWeek) * 100) : 0;

  const onShift = data.crew.filter((member) => member.status !== "off_shift");
  const loaded = onShift.filter(
    (member) => member.status === "on_job" || member.jobsToday >= 2,
  ).length;
  const laborLoad = onShift.length > 0 ? Math.round((loaded / onShift.length) * 100) : 0;

  const lowStockNow = data.inventory.filter(isLowStock).length;

  return [
    {
      id: "completion-rate",
      label: "Completion rate",
      now: `${completionRate}%`,
      delta: formatTrendDelta(completedWeek > 0 ? 4 : 0),
      direction: trendDirection(completedWeek > 0 ? 4 : 0),
      drillTo: "/operations?filter=completed",
    },
    {
      id: "labor-load",
      label: "Labor load",
      now: `${laborLoad}%`,
      delta: formatTrendDelta(loaded > 1 ? 1 : 0),
      direction: trendDirection(loaded > 1 ? 1 : 0),
      drillTo: "/operations?filter=crew",
    },
    {
      id: "inventory-drift",
      label: "Inventory drift",
      now: String(lowStockNow),
      delta: formatTrendDelta(lowStockNow > 0 ? 1 : 0),
      direction: trendDirection(lowStockNow > 0 ? 1 : 0),
      drillTo: "/builds?filter=inventory",
    },
  ];
}

export function buildExecutiveDashboard(data: MockData): ExecutiveDashboardModel {
  return {
    kpis: computeKpis(data),
    dispatch: computeDispatch(data),
    actionQueue: computeActionQueue(data),
    revenue: computeRevenue(data),
    risk: computeRisk(data),
    trends: computeTrends(data),
  };
}
