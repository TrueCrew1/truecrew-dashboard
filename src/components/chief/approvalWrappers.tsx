import type { ReactNode } from "react";

interface ApprovalSectionHeaderProps {
  title: string;
  titleId?: string;
  count?: string;
  status?: ReactNode;
}

/** Title row with optional count or status chip — shared across Chief approval/review sections. */
export function ApprovalSectionHeader({
  title,
  titleId,
  count,
  status,
}: ApprovalSectionHeaderProps) {
  return (
    <div className="chief-section-header">
      <h2 className="chief-section-title" id={titleId}>
        {title}
      </h2>
      {count ? <span className="chief-section-count">{count}</span> : null}
      {status ?? null}
    </div>
  );
}

interface ApprovalSurfaceEmptyProps {
  lead: string;
  description: string;
  /** `audit` uses dashed audit-empty framing; `section` is the default Chief panel empty state. */
  variant?: "section" | "audit";
}

/** Consistent empty framing for approval, audit, and history surfaces. */
export function ApprovalSurfaceEmpty({
  lead,
  description,
  variant = "section",
}: ApprovalSurfaceEmptyProps) {
  if (variant === "audit") {
    return (
      <div className="chief-audit-empty" role="status">
        <p className="chief-audit-empty-lead">{lead}</p>
        <p className="chief-audit-empty-desc">{description}</p>
      </div>
    );
  }

  return (
    <div className="chief-section-empty">
      <p className="chief-section-empty-lead">{lead}</p>
      <p className="chief-section-empty-desc">{description}</p>
    </div>
  );
}

interface ApprovalSectionShellProps {
  title?: string;
  titleId?: string;
  count?: string;
  status?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Section shell: optional header plus body content inside a Chief surface container. */
export function ApprovalSectionShell({
  title,
  titleId,
  count,
  status,
  className,
  children,
}: ApprovalSectionShellProps) {
  return (
    <div className={className}>
      {title ? (
        <ApprovalSectionHeader
          title={title}
          titleId={titleId}
          count={count}
          status={status}
        />
      ) : null}
      {children}
    </div>
  );
}

interface ApprovalHistoryShellProps {
  title: string;
  titleId: string;
  count: string;
  children: ReactNode;
}

/** Bordered audit/history block with a standard section header. */
export function ApprovalHistoryShell({
  title,
  titleId,
  count,
  children,
}: ApprovalHistoryShellProps) {
  return (
    <section className="chief-audit-section" aria-labelledby={titleId}>
      <ApprovalSectionHeader title={title} titleId={titleId} count={count} />
      {children}
    </section>
  );
}

interface ApprovalSummaryStripProps {
  children: ReactNode;
  label?: string;
}

/** Container for warning/status summary strips above review and approval tables. */
export function ApprovalSummaryStrip({
  children,
  label = "Status summary",
}: ApprovalSummaryStripProps) {
  return (
    <div className="approval-summary-strip" role="region" aria-label={label}>
      {children}
    </div>
  );
}
