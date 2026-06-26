import { StageBadge, StatusBadge } from "@/components/ui";
import type { TodayTask } from "@/lib/today";
import { CREW_LABELS, isOverdue, isSlaBreaching, scoreReasons } from "@/lib/today";
import { WorkflowStage } from "@/types";

function stageAsEnum(stage: string): WorkflowStage {
  return (Object.values(WorkflowStage) as string[]).includes(stage)
    ? (stage as WorkflowStage)
    : WorkflowStage.Inbox;
}

function TaskMeta({ task }: { task: TodayTask }) {
  const parts: string[] = [];
  if (task.site_name) parts.push(task.site_name);
  if (task.crew) parts.push(CREW_LABELS[task.crew as keyof typeof CREW_LABELS] ?? task.crew);
  if (task.assignee) parts.push(task.assignee);
  const reasons = scoreReasons(task).slice(0, 2);
  if (reasons.length) parts.push(reasons.join(" · "));

  return <p className="today-list-meta">{parts.join(" · ") || task.workflow_type}</p>;
}

export function TodayTaskRow({
  task,
  highlight,
  showWaitingOn,
}: {
  task: TodayTask;
  highlight?: boolean;
  showWaitingOn?: boolean;
}) {
  return (
    <div className={`today-list-row today-list-row-static${highlight ? " active" : ""}`}>
      <div className="today-list-main">
        <p className="today-list-title">{task.title}</p>
        {showWaitingOn && task.waiting_on ? (
          <p className="today-list-meta">Waiting on: {task.waiting_on}</p>
        ) : task.blocker ? (
          <p className="today-list-meta">{task.blocker}</p>
        ) : (
          <TaskMeta task={task} />
        )}
      </div>
      <div className="today-list-actions">
        {isSlaBreaching(task) ? (
          <StatusBadge status="SLA" variant="red" />
        ) : isOverdue(task) ? (
          <StatusBadge status="Overdue" variant="orange" />
        ) : null}
        <StageBadge stage={stageAsEnum(task.stage)} />
      </div>
    </div>
  );
}

export function TodayZone({
  id,
  title,
  count,
  countLabel,
  variant,
  padded,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  countLabel?: string;
  variant?: "default" | "danger";
  padded?: boolean;
  children: React.ReactNode;
}) {
  const zoneClass = ["today-zone", variant === "danger" ? "today-zone-danger" : ""]
    .filter(Boolean)
    .join(" ");
  const titleClass = ["today-zone-title", variant === "danger" ? "today-zone-title-danger" : ""]
    .filter(Boolean)
    .join(" ");
  const badgeClass = ["today-zone-count", variant === "danger" ? "today-zone-count-danger" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={zoneClass} aria-labelledby={id}>
      <div className="today-zone-header">
        <h2 id={id} className={titleClass}>
          {title}
        </h2>
        {countLabel ?? count !== undefined ? (
          <span className={badgeClass}>{countLabel ?? count}</span>
        ) : null}
      </div>
      <div className={`today-zone-body${padded ? " padded" : ""}`}>{children}</div>
    </section>
  );
}

export function TodayZoneEmpty() {
  return <p className="today-empty">No items yet</p>;
}
