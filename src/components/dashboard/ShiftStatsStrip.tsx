import { Link } from "react-router-dom";
import { useData } from "@/context/DataContext";
import {
  deriveShiftStats,
  SHIFT_STAT_LINKS,
  type ShiftStats,
} from "../../../lib/queries/dashboard-stats";

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
    <div className="shift-stats-block">
      <nav className="shift-stats-strip" aria-label="Shift at-a-glance stats">
        <StatCard
          label="Open Work Orders"
          count={resolved.openWorkOrders}
          href={SHIFT_STAT_LINKS.openWorkOrders}
          loading={loading}
        />
        <StatCard
          label="Overdue PMs"
          count={resolved.overduePMs}
          href={SHIFT_STAT_LINKS.overduePMs}
          loading={loading}
        />
        <StatCard
          label="Active Incidents"
          count={resolved.activeIncidents}
          href={SHIFT_STAT_LINKS.activeIncidents}
          loading={loading}
          warning
        />
      </nav>
      <p
        className="shift-stats-hint"
        title="Mirrors the same priority data shown in Chief's Command Center."
      >
        Stats may use demo data in non-production environments.
      </p>
    </div>
  );
}
