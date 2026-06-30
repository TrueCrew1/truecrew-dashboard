import { useEffect, useRef, useState } from "react";
import {
  getBlockingGates,
  resolveStageChange,
  resolveTaskGates,
} from "../../../lib/stage-change";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { showToast } from "@/components/ui/toast";
import { useData } from "@/context/DataContext";
import { WORKFLOW_STAGES, WorkflowStage } from "@/types";

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
  saving = false,
  confirmation,
  error,
  onRetry,
}: {
  stage: WorkflowStage;
  onChange: (stage: WorkflowStage) => void;
  disabled?: boolean;
  saving?: boolean;
  confirmation?: string | null;
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <span className="stage-select-wrap" onClick={(e) => e.stopPropagation()}>
      <select
        className="stage-select"
        value={stage}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as WorkflowStage)}
        aria-label="Task stage"
        aria-busy={saving}
      >
        {WORKFLOW_STAGES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {saving ? (
        <span className="stage-select-status saving" aria-live="polite">
          Saving…
        </span>
      ) : confirmation ? (
        <span className="stage-select-status saved" aria-live="polite">
          {confirmation}
        </span>
      ) : null}
      {error ? (
        <span className="stage-select-error" role="alert">
          <span>{error}</span>
          {onRetry ? (
            <button
              type="button"
              className="stage-select-retry"
              onClick={onRetry}
            >
              Retry
            </button>
          ) : null}
        </span>
      ) : null}
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
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const lastAttemptRef = useRef<WorkflowStage | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const applyStage = async (next: WorkflowStage) => {
    lastAttemptRef.current = next;
    setError(null);
    setConfirmation(null);

    const gates = resolveTaskGates(taskId, data.tasks, data.workflows);
    const blockingGates = getBlockingGates(gates);
    const confirmed = await resolveStageChange(next, blockingGates, (options) =>
      confirm(options),
    );
    if (!confirmed) return;

    try {
      await updateTaskStage(taskId, next);
      setConfirmation(`Stage updated to ${next}`);
      showToast("Stage change saved");
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmation(null), 3000);
    } catch {
      setError(`Couldn't save the change to ${next}. Stage kept at ${stage}.`);
      showToast(`Couldn't save stage change. Stage kept at ${stage}.`, "error");
    }
  };

  const handleChange = (next: WorkflowStage) => {
    if (next === stage) return;
    void applyStage(next);
  };

  const handleRetry = () => {
    const target = lastAttemptRef.current;
    if (target && target !== stage) void applyStage(target);
    else setError(null);
  };

  const saving = isTaskUpdating(taskId);

  return (
    <StageSelect
      stage={stage}
      onChange={handleChange}
      disabled={saving}
      saving={saving}
      confirmation={confirmation}
      error={error}
      onRetry={error ? handleRetry : undefined}
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

export function TableScroll({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`table-scroll${wide ? " table-scroll--wide" : ""}`}>{children}</div>
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
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
