import { StageBadge } from "@/components/ui";
import type { TodayTask } from "@/lib/today/types";
import { formatSlaRemaining } from "@/lib/today/selectors";

interface MitCardProps {
  task: TodayTask | null;
  onSelect: (taskId: string) => void;
}

export function MitCard({ task, onSelect }: MitCardProps) {
  return (
    <section className="today-mit">
      <div className="today-mit-glow" />
      <div className="today-mit-inner">
        <div className="today-mit-label">Most Important Now</div>
        {task ? (
          <>
            <h2
              className="today-mit-title clickable-row"
              onClick={() => onSelect(task.id)}
            >
              {task.title}
            </h2>
            <div className="today-mit-meta">
              <StageBadge stage={task.stage} />
              <span className={`sla-badge sla-${task.slaTier}`}>
                {task.slaTier.toUpperCase()}
              </span>
              <span className="today-mit-site">{task.site}</span>
              <span className="today-mit-crew">{task.crew}</span>
              <span className="today-mit-sla">{formatSlaRemaining(task)}</span>
            </div>
            {task.description ? (
              <p className="today-mit-desc">{task.description}</p>
            ) : null}
          </>
        ) : (
          <div className="today-mit-empty">
            No MIT set — pick from Priority Queue or Quick Capture
          </div>
        )}
      </div>
    </section>
  );
}
