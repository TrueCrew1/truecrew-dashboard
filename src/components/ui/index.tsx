import { useState } from "react";
import { useData } from "@/context/DataContext";
import { WORKFLOW_STAGES, WorkflowStage, type Customer } from "@/types";

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
}: {
  stage: WorkflowStage;
  onChange: (stage: WorkflowStage) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  return (
    <span className="stage-select-wrap" onClick={(e) => e.stopPropagation()}>
      <select
        className="stage-select"
        value={stage}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as WorkflowStage)}
        aria-label="Task stage"
      >
        {WORKFLOW_STAGES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {error ? <span className="stage-select-error">{error}</span> : null}
    </span>
  );
}

export function TaskStageSelect({
  taskId,
  stage,
}: {
  taskId: string;
  stage: WorkflowStage;
}) {
  const { updateTaskStage, isTaskUpdating } = useData();
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (next: WorkflowStage) => {
    if (next === stage) return;
    setError(null);
    try {
      await updateTaskStage(taskId, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <StageSelect
      stage={stage}
      onChange={handleChange}
      disabled={isTaskUpdating(taskId)}
      error={error}
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

export function CustomerContextCell({
  name,
  tier,
}: {
  name: string | null;
  tier?: Customer["tier"];
}) {
  if (!name) {
    return <span style={{ color: "var(--steel-dim)" }}>—</span>;
  }

  return (
    <span className="customer-context">
      <span>{name}</span>
      {tier ? (
        <span className="badge badge-steel" style={{ marginLeft: 6 }}>
          {tier}
        </span>
      ) : null}
    </span>
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
