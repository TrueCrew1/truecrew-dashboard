import Link from "next/link";
import { WorkflowStage } from "@/types";

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

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="page-shell">{children}</div>;
}

export function PageHeader({
  kicker,
  title,
  accent,
  subtitle,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  accent?: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const desc = description ?? subtitle;

  return (
    <header className="page-header-shell">
      <div className="page-header-main">
        {kicker ? <p className="page-kicker">{kicker}</p> : null}
        <h1 className="page-title">
          {title}
          {accent ? <> <em>{accent}</em></> : null}
        </h1>
        {desc ? <p className="page-subtitle">{desc}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function PageButton({
  variant = "secondary",
  href,
  onClick,
  type = "button",
  children,
}: {
  variant?: "primary" | "secondary";
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  children: React.ReactNode;
}) {
  const className = `page-btn page-btn-${variant}`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={className} onClick={onClick}>
      {children}
    </button>
  );
}

export function FiltersToolbar({
  searchPlaceholder = "Filter records…",
  children,
}: {
  searchPlaceholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-toolbar" role="toolbar" aria-label="Filters">
      <div className="page-toolbar-group">
        <input
          type="search"
          className="page-input"
          placeholder={searchPlaceholder}
          aria-label="Filter"
        />
        <select className="page-select" aria-label="Status filter" defaultValue="">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      {children ? <div className="page-toolbar-group">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = "TC",
  title,
  copy,
}: {
  icon?: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="page-state">
      <div className="page-state-icon">{icon}</div>
      <h2 className="page-state-title">{title}</h2>
      <p className="page-state-copy">{copy}</p>
    </div>
  );
}

export function LoadingState({ copy }: { copy: string }) {
  return (
    <div className="page-state">
      <p className="page-state-copy">{copy}</p>
      <div className="page-loading-bar" aria-hidden="true" />
    </div>
  );
}

export function ErrorState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="page-state page-state-error">
      <div className="page-state-icon">!</div>
      <h2 className="page-state-title">{title}</h2>
      <p className="page-state-copy">{copy}</p>
    </div>
  );
}

export function Panel({
  title,
  action,
  badge,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        <div className="panel-header-end">
          {badge}
          {action}
        </div>
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

export function DataTableShell({
  columns,
  rows,
  emptyTitle,
  emptyCopy,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyTitle: string;
  emptyCopy: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} copy={emptyCopy} />;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StatusRow({ label, copy }: { label: string; copy: React.ReactNode }) {
  return (
    <div className="status-row">
      <div className="status-row-label">{label}</div>
      <p className="status-row-copy">{copy}</p>
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
