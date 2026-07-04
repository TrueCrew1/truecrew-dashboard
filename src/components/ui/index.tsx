import { useEffect, useRef, useState } from "react";
import { useData } from "@/context/DataContext";
import type { GateCheck } from "@/types";
import { WORKFLOW_STAGES, WorkflowStage } from "@/types";

const CLOSEOUT_STAGES = new Set([WorkflowStage.Done, WorkflowStage.Logged]);

function confirmCloseout(next: WorkflowStage, blockingGates: GateCheck[]): boolean {
  const gateWarning =
    blockingGates.length > 0
      ? `${blockingGates.length} required gate(s) still open: ${blockingGates.map((g) => g.label).join(", ")}.\n\n`
      : "";

  if (next === WorkflowStage.Logged) {
    return window.confirm(
      `${gateWarning}Log this task? It will be archived from active workflows.`,
    );
  }

  if (next === WorkflowStage.Done) {
    return window.confirm(`${gateWarning}Mark as Done? Confirm work is complete.`);
  }

  return true;
}

export function StageBadge({ stage }: { stage: WorkflowStage }) {
  const activeStages = [
    WorkflowStage.InProgress,
    WorkflowStage.Review,
    WorkflowStage.Waiting,
  ];
  return (
    <span className={`stage-pill ${activeStages.includes(stage) ? "active" : ""}`}>
      {stage}
    </span>
  );
}

export function StageSelect({
  stage,
  onChange,
  disabled,
  error,
  status = "idle",
}: {
  stage: WorkflowStage;
  onChange: (stage: WorkflowStage) => void;
  disabled?: boolean;
  error?: string | null;
  status?: "idle" | "saving" | "saved";
}) {
  return (
    <span className="stage-select-wrap" onClick={(e) => e.stopPropagation()}>
      <select
        className="stage-select"
        value={stage}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as WorkflowStage)}
        aria-label="Task stage"
        aria-busy={status === "saving"}
      >
        {WORKFLOW_STAGES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {status === "saving" ? (
        <span className="stage-select-status saving" aria-live="polite">
          Saving…
        </span>
      ) : status === "saved" ? (
        <span className="stage-select-status saved" aria-live="polite">
          Saved
        </span>
      ) : null}
      {error ? <span className="stage-select-error">{error}</span> : null}
    </span>
  );
}

export function getNextWorkflowStage(stage: WorkflowStage): WorkflowStage | null {
  const index = WORKFLOW_STAGES.indexOf(stage);
  if (index < 0 || index >= WORKFLOW_STAGES.length - 1) return null;
  return WORKFLOW_STAGES[index + 1];
}

export function AdvanceButton({
  label,
  onClick,
  disabled,
  loading,
  error,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <div className="advance-btn-wrap">
      <button
        type="button"
        className="topbar-btn primary advance-btn"
        onClick={() => void onClick()}
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <span className="advance-btn-spinner" aria-hidden="true" />
            Advancing…
          </>
        ) : (
          label
        )}
      </button>
      {error ? <span className="stage-select-error">{error}</span> : null}
    </div>
  );
}

export function TaskStageSelect({
  taskId,
  stage,
}: {
  taskId: string;
  stage: WorkflowStage;
}) {
  const { updateTaskStage, isTaskUpdating, data } = useData();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleChange = async (next: WorkflowStage) => {
    if (next === stage) return;
    setError(null);
    setSaved(false);

    if (CLOSEOUT_STAGES.has(next)) {
      const taskGates = data.tasks.find((t) => t.id === taskId)?.gates ?? [];
      const blockingGates = taskGates.filter((g) => g.required && !g.passed);
      if (!confirmCloseout(next, blockingGates)) return;
    }

    try {
      await updateTaskStage(taskId, next);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const isUpdating = isTaskUpdating(taskId);
  const status = isUpdating ? "saving" : saved ? "saved" : "idle";

  return (
    <StageSelect
      stage={stage}
      onChange={handleChange}
      disabled={isUpdating}
      error={error}
      status={status}
    />
  );
}

export function SeverityBadge({ severity }: { severity: 1 | 2 | 3 | 4 }) {
  const map: Record<number, { label: string; className: string }> = {
    1: { label: "Sev 1", className: "badge-red" },
    2: { label: "Sev 2", className: "badge-orange" },
    3: { label: "Sev 3", className: "badge-yellow" },
    4: { label: "Sev 4", className: "badge-steel" },
  };
  const { label, className } = map[severity];
  return <span className={`badge ${className}`}>{label}</span>;
}

export function StatusBadge({
  status,
  variant = "steel",
}: {
  status: string;
  variant?: "green" | "red" | "yellow" | "orange" | "blue" | "steel";
}) {
  return <span className={`badge badge-${variant}`}>{status}</span>;
}

export function PageHeader({
  title,
  accent,
  subtitle,
}: {
  title: string;
  accent?: string;
  subtitle?: string;
}) {
  return (
    <header className="page-header">
      <h1 className="page-title">
        {title}
        {accent ? <> <em>{accent}</em></> : null}
      </h1>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  variant = "default",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "filter" | "success";
}) {
  return (
    <div className={`empty-state empty-state--${variant}`}>
      <div className="empty-state-title">{title}</div>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}

export function PanelEmpty({
  emptyKey,
  title,
  description,
  action,
  variant = "default",
}: {
  emptyKey: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "filter" | "success";
}) {
  return (
    <div className="panel-empty" data-empty={emptyKey} role="status">
      <EmptyState
        title={title}
        description={description}
        action={action}
        variant={variant}
      />
    </div>
  );
}

export function PanelFilterEmpty({
  emptyKey,
  filterLabel,
  description,
  clearAction,
}: {
  emptyKey: string;
  filterLabel: string;
  description: string;
  clearAction: React.ReactNode;
}) {
  return (
    <PanelEmpty
      emptyKey={emptyKey}
      title={`No matches for “${filterLabel}”`}
      description={description}
      action={clearAction}
      variant="filter"
    />
  );
}

export {
  formatTableValue,
  GatesCell,
  isBlankTableValue,
  TABLE_MISSING,
  TableText,
} from "@/components/ui/table";

export function TableScroll({
  children,
  wide,
  stickyFirst,
  label,
  className,
}: {
  children: React.ReactNode;
  wide?: boolean;
  stickyFirst?: boolean;
  /** Screen-reader hint for horizontally scrollable tables */
  label?: string;
  className?: string;
}) {
  const classes = [
    "table-scroll",
    wide ? "table-scroll--wide" : "",
    stickyFirst ? "table-scroll--sticky-first" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} tabIndex={stickyFirst ? 0 : undefined}>
      {label ? <span className="table-scroll-sr">{label}</span> : null}
      {children}
    </div>
  );
}

export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string | number; meta?: string }[];
}) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <div className="stat-label">{stat.label}</div>
          <div className="stat-value">{stat.value}</div>
          {stat.meta ? <div className="stat-meta">{stat.meta}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function GateList({
  gates,
}: {
  gates: { id: string; label: string; required: boolean; passed: boolean }[];
}) {
  return (
    <ul className="gate-list">
      {gates.map((gate) => (
        <li key={gate.id}>
          <span className={`gate-check ${gate.passed ? "passed" : "failed"}`}>
            {gate.passed ? "✓" : ""}
          </span>
          <span>
            {gate.label}
            {!gate.required ? (
              <span style={{ color: "var(--steel-dim)", marginLeft: 6 }}>(optional)</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function formatRelativeTime(isoDate: string): string {
  if (!isoDate) return "—";
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
