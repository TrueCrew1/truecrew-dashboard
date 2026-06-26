import type { NextAction } from "@/lib/today/types";

function formatDeadline(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) {
    const hours = Math.abs(Math.floor(diff / 3600000));
    if (hours < 24) return `${hours}h overdue`;
    return `${Math.floor(hours / 24)}d overdue`;
  }
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

interface NextActionCardProps {
  action: NextAction | null;
  onSelect: (taskId: string) => void;
}

export function NextActionCard({ action, onSelect }: NextActionCardProps) {
  if (!action) {
    return (
      <section className="next-action next-action-empty">
        <div className="next-action-label">Next Action</div>
        <p>Queue clear — no actionable items</p>
      </section>
    );
  }

  return (
    <section
      className={`next-action next-action-${action.urgency} clickable-row`}
      onClick={() => onSelect(action.taskId)}
    >
      <div className="next-action-label">Next Action</div>
      <h3 className="next-action-title">{action.title}</h3>
      <p className="next-action-reason">{action.reason}</p>
      {action.slaDueAt ? (
        <span className="next-action-sla">{formatDeadline(action.slaDueAt)}</span>
      ) : null}
    </section>
  );
}
