import { Panel, StatusBadge } from "@/components/ui";

interface Metric {
  label: string;
  value: string | number;
}

interface PlatformHealthCardProps {
  title: string;
  status: string;
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  mockMode?: boolean;
}

function PlatformHealthCard({
  title,
  status,
  metrics,
  loading,
  error,
  mockMode = false,
}: PlatformHealthCardProps) {
  const statusVariant = (status: string): "green" | "red" | "yellow" | "steel" => {
    if (status === "healthy" || status === "ready" || status === "completed")
      return "green";
    if (status === "degraded" || status === "building" || status === "pending")
      return "yellow";
    if (status === "down" || status === "failed" || status === "error")
      return "red";
    return "steel";
  };

  // In mock mode, show placeholder state
  if (mockMode) {
    return (
      <Panel title={title} action={<StatusBadge status="mock" variant="steel" />}>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div className="stat-value">—</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Last check</div>
            <div className="stat-value">mock mode</div>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      action={
        loading ? (
          <span className="panel-title" style={{ color: "var(--steel-dim)" }}>
            Loading…
          </span>
        ) : (
          <StatusBadge status={status} variant={statusVariant(status)} />
        )
      }
    >
      {loading ? (
        <div className="health-card-skeleton">
          <div className="skeleton-line" />
          <div className="skeleton-line" style={{ width: "60%" }} />
          <div className="skeleton-line" style={{ width: "80%" }} />
        </div>
      ) : error ? (
        <div className="health-card-error" role="alert">
          <span className="health-card-error-icon" aria-hidden="true">
            ⚠
          </span>
          <span className="health-card-error-text">{error}</span>
        </div>
      ) : (
        <div className="stat-grid">
          {metrics.map((metric) => (
            <div key={metric.label} className="stat-card">
              <div className="stat-label">{metric.label}</div>
              <div className="stat-value">{metric.value}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export { PlatformHealthCard };
