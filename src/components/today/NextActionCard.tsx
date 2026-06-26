import type { NextActionStep } from "@/lib/today";
import { StatusBadge } from "@/components/ui";

const URGENCY_VARIANT: Record<
  NextActionStep["urgency"],
  "red" | "orange" | "steel" | "green"
> = {
  critical: "red",
  high: "orange",
  normal: "steel",
  low: "green",
};

export function NextActionCard({ step }: { step: NextActionStep }) {
  return (
    <div className={`today-next-action today-next-${step.urgency}`}>
      <div className="today-next-action-head">
        <StatusBadge status={step.urgency.toUpperCase()} variant={URGENCY_VARIANT[step.urgency]} />
        <p className="today-next-action-title">{step.action}</p>
      </div>
      <p className="today-next-action-detail">{step.detail}</p>
    </div>
  );
}
