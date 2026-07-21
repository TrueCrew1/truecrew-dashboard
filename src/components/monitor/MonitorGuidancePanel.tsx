import { Panel, StatusBadge } from "@/components/ui";
import type { MonitorGuidance, MonitorGuidanceTone } from "./monitorGuidance";

const TONE_BADGE: Record<MonitorGuidanceTone, { label: string; variant: "green" | "red" | "yellow" | "steel" }> = {
  healthy: { label: "Healthy", variant: "green" },
  "vercel-degraded": { label: "Vercel issue", variant: "yellow" },
  "supabase-degraded": { label: "Supabase issue", variant: "yellow" },
  "both-degraded": { label: "Both degraded", variant: "red" },
  unavailable: { label: "Unconfirmed", variant: "red" },
  loading: { label: "Checking…", variant: "steel" },
  mock: { label: "Mock mode", variant: "steel" },
};

interface MonitorGuidancePanelProps {
  guidance: MonitorGuidance;
}

export function MonitorGuidancePanel({ guidance }: MonitorGuidancePanelProps) {
  const badge = TONE_BADGE[guidance.tone];

  return (
    <Panel
      title="Operator guidance"
      action={<StatusBadge status={badge.label} variant={badge.variant} />}
    >
      <p className="monitor-guidance-summary" role="status">
        {guidance.summary}
      </p>
      <p className="monitor-guidance-detail">{guidance.detail}</p>
      {guidance.checklist.length > 0 ? (
        <ul className="monitor-guidance-checklist">
          {guidance.checklist.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
