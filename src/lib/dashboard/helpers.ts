import type { MockData } from "@/data/mockData";
import type { Invoice, Job } from "@/types";

const MS_HOUR = 3600000;

export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / MS_HOUR;
}

export function formatAge(iso: string): string {
  const hours = Math.floor(hoursSince(iso));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function isSameDay(a: string, b: Date = new Date()): boolean {
  const date = new Date(a);
  return (
    date.getFullYear() === b.getFullYear() &&
    date.getMonth() === b.getMonth() &&
    date.getDate() === b.getDate()
  );
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function isOpenJob(job: Job): boolean {
  return job.status !== "complete";
}

export function isOverdueJob(job: Job): boolean {
  return isOpenJob(job) && new Date(job.dueAt).getTime() < Date.now();
}

export function isUnassignedJob(job: Job): boolean {
  return isOpenJob(job) && !job.assigneeId;
}

export function isDueTodayJob(job: Job): boolean {
  return isOpenJob(job) && isSameDay(job.dueAt);
}

export function isLowStock(item: MockData["inventory"][number]): boolean {
  return item.quantity <= item.reorderPoint;
}

export function isPendingInvoice(invoice: Invoice): boolean {
  return invoice.status === "draft" || invoice.status === "sent" || invoice.status === "overdue";
}

export function isUnpaidInvoice(invoice: Invoice): boolean {
  return invoice.status === "sent" || invoice.status === "overdue";
}

export function trendDirection(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function formatTrendDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return String(delta);
  return "→";
}

export function actionPill(type: string): string {
  const map: Record<string, string> = {
    closeout: "Closeout",
    approval: "Approval",
    failed_send: "Failed send",
    follow_up: "Follow-up",
  };
  return map[type] ?? type;
}

export function actionDrillTo(type: string): string {
  if (type === "closeout" || type === "approval") return "/review";
  if (type === "failed_send") return "/customers?filter=invoices";
  return "/repair";
}
