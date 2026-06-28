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
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=Oswald:wght@500;600;700&display=swap");

        .shift-stats-strip {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          overflow-x: auto;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .shift-stats-strip::-webkit-scrollbar {
          display: none;
        }

        .shift-stats-card {
          flex: 1 1 0;
          min-width: 132px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          color: inherit;
          text-decoration: none;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }

        .shift-stats-card:hover {
          border-color: rgba(255, 122, 26, 0.35);
          transform: translateY(-1px);
        }

        .shift-stats-card--zero .shift-stats-value {
          color: var(--steel-dim);
        }

        .shift-stats-card--warning {
          border-color: rgba(255, 122, 26, 0.45);
          background: rgba(255, 122, 26, 0.08);
          box-shadow: 0 0 18px rgba(255, 122, 26, 0.18);
        }

        .shift-stats-card--warning .shift-stats-value {
          color: var(--orange);
        }

        .shift-stats-label {
          font-family: "Oswald", var(--font-display), sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--steel-dim);
        }

        .shift-stats-value {
          font-family: "Barlow", var(--font-body), sans-serif;
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
          color: var(--text);
        }

        .shift-stats-skeleton {
          display: block;
          width: 2.5rem;
          height: 28px;
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.05) 100%
          );
          background-size: 200% 100%;
          animation: shift-stats-shimmer 1.2s ease-in-out infinite;
        }

        @keyframes shift-stats-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }

        @media (max-width: 640px) {
          .shift-stats-strip {
            scroll-snap-type: x mandatory;
          }

          .shift-stats-card {
            scroll-snap-align: start;
            min-width: 148px;
          }
        }
      `}</style>

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
    </>
  );
}
