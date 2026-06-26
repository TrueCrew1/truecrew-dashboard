import Link from "next/link";
import type { ReactNode } from "react";
import { PageButton, PageHeader, PageShell, StatusBadge } from "@/components/ui";

export function DetailBackLink({ href, label }: { href: string; label: string }) {
  return (
    <PageButton href={href} variant="secondary">
      ← {label}
    </PageButton>
  );
}

export function DetailLayout({
  kicker,
  title,
  description,
  backHref,
  backLabel,
  badges,
  stats,
  main,
  sidebar,
}: {
  kicker: string;
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  badges?: ReactNode;
  stats: { label: string; value: string | number; meta?: string }[];
  main: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <PageShell>
      <PageHeader
        kicker={kicker}
        title={title}
        description={description}
        actions={
          <div className="ops-detail-actions">
            <DetailBackLink href={backHref} label={backLabel} />
            {badges}
          </div>
        }
      />

      <div className="stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            {stat.meta ? <div className="stat-meta">{stat.meta}</div> : null}
          </div>
        ))}
      </div>

      <div className="ops-detail-layout">
        <div className="ops-detail-main">{main}</div>
        <aside className="ops-detail-sidebar">{sidebar}</aside>
      </div>
    </PageShell>
  );
}

export function DetailPanel({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        {badge ? <div className="panel-header-end">{badge}</div> : null}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function DetailLinkList({
  items,
}: {
  items: { href: string; title: string; meta?: string; badge?: ReactNode }[];
}) {
  if (!items.length) {
    return <p className="ops-detail-empty">No related records</p>;
  }

  return (
    <ul className="ops-link-list">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="ops-link-item">
            <span className="ops-link-title">{item.title}</span>
            {item.meta ? <span className="ops-link-meta">{item.meta}</span> : null}
            {item.badge}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DetailStatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: "green" | "red" | "yellow" | "orange" | "blue" | "steel";
}) {
  return <StatusBadge status={label} variant={variant} />;
}
