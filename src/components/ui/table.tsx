import type { GateCheck } from "@/types";

/** Standard placeholder for missing table cell values. */
export const TABLE_MISSING = "—";

export function isBlankTableValue(
  value: string | null | undefined,
): value is null | undefined | "" {
  return value === null || value === undefined || value.trim() === "";
}

export function formatTableValue(
  value: string | null | undefined,
  fallback: string = TABLE_MISSING,
): string {
  return isBlankTableValue(value) ? fallback : value;
}

type TableTextProps = {
  value: string | null | undefined;
  fallback?: string;
  mono?: boolean;
  truncate?: boolean;
  clamp2?: boolean;
  title?: string;
  className?: string;
};

/** Inline text with consistent missing-value styling for table cells. */
export function TableText({
  value,
  fallback = TABLE_MISSING,
  mono,
  truncate,
  clamp2,
  title,
  className,
}: TableTextProps) {
  const display = formatTableValue(value, fallback);
  const isMissing = display === fallback;
  const classes = [
    isMissing ? "cell-empty" : "",
    mono ? "cell-mono" : "",
    truncate ? "cell-truncate" : "",
    clamp2 ? "cell-clamp-2" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const resolvedTitle =
    title ?? (truncate && !isMissing ? display : isMissing ? undefined : display);

  return (
    <span className={classes || undefined} title={resolvedTitle}>
      {display}
    </span>
  );
}

type GatesCellProps = {
  gates: GateCheck[];
  clearLabel?: string;
};

/** Open required gates, or a clear-state label when none are blocking. */
export function GatesCell({ gates, clearLabel = "Clear" }: GatesCellProps) {
  const openGates = gates.filter((gate) => gate.required && !gate.passed);
  const openLabels = openGates.map((gate) => gate.label).join(" · ");

  return (
    <span
      className={
        openGates.length > 0 ? "cell-warning cell-truncate" : "cell-success"
      }
      title={openGates.length > 0 ? openLabels : undefined}
    >
      {openGates.length > 0 ? openLabels : clearLabel}
    </span>
  );
}
