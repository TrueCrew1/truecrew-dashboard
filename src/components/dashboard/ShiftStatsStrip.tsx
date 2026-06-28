import { Link } from "react-router-dom";
import { deriveShiftStats, SHIFT_STAT_LINKS, type ShiftStats } from "../../../lib/queries/dashboard-stats";
import { useData } from "@/context/DataContext";

interface StatCardProps {
  label: string;
  count: number;
  href: string;
  loading: boolean;
  warning?: boolean;
}

function StatCard({ label, count, href, loading, warning = false }: StatCardProps) {
  const isZero = !loading && count === 0;

  return (
    <Link
      to={href}
      className={[
        "shift-stats-card",
        warning && count > 0 ? "shift-stats-card--warning" : "",
        isZero ? "shift-stats-card--zero" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${label}: ${loading ? "loading" : count}`}
    >
      <span className="shift-stats-label">{label}</span>
      {loading ? (
        <span className="shift-stats-value shift-stats-skeleton" aria-hidden />
      ) : (
        <span className="shift-stats-value">{count}</span>
      )}
    </Link>
  );
}

export function ShiftStatsStrip({ stats }: { stats?: ShiftStats }) {
  const { data, loading } = useData();
  const resolved = stats ?? deriveShiftStats(data);

  return (
    <nav className="shift-stats-strip" aria-label="Shift at-a-glance stats">
      <StatCard
        label="Focus queue"
        count={resolved.focusQueue}
        href={SHIFT_STAT_LINKS.focusQueue}
        loading={loading}
      />
      <StatCard
        label="Blocking gates"
        count={resolved.blockingGates}
        href={SHIFT_STAT_LINKS.blockingGates}
        loading={loading}
        warning
      />
      <StatCard
        label="Active incidents"
        count={resolved.activeIncidents}
        href={SHIFT_STAT_LINKS.activeIncidents}
        loading={loading}
        warning
      />
    </nav>
  );
}
