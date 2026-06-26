import { useState } from "react";
import { useLocation } from "react-router-dom";
import { GateList, SeverityBadge, StageBadge, formatRelativeTime } from "@/components/ui";
import { useData } from "@/context/DataContext";
import type { MockData } from "@/data/mockData";
import { updateGate } from "@/lib/api/client";
import { WorkflowStage, type Task } from "@/types";

interface ContextRailProps {
  open: boolean;
  onClose: () => void;
  selectedEntityId?: string | null;
}

function DefaultRailContent({ data }: { data: MockData }) {
  const blockedBuild = data.tasks.find(
    (t) => t.workflowType === "build" && t.gates.some((g) => g.required && !g.passed),
  );

  return (
    <>
      <div className="rail-section">
        <div className="rail-section-title">Today's focus</div>
        {data.focusItems.map((item) => (
          <div key={item.id} className="rail-item">
            <div className="rail-item-title">{item.title}</div>
            <div className="rail-item-meta">
              <StageBadge stage={item.stage} /> · {item.reason}
            </div>
          </div>
        ))}
      </div>

      <div className="rail-section">
        <div className="rail-section-title">Open alerts</div>
        {data.alerts.map((alert) => (
          <div key={alert.id} className="rail-item">
            <div className="rail-item-title">{alert.title}</div>
            <div className="rail-item-meta">
              {typeof alert.severity === "number" ? (
                <SeverityBadge severity={alert.severity} />
              ) : null}{" "}
              · {formatRelativeTime(alert.timestamp)}
            </div>
            <div className="rail-item-meta" style={{ marginTop: 4 }}>
              {alert.message}
            </div>
          </div>
        ))}
      </div>

      <div className="rail-section">
        <div className="rail-section-title">Next gate due</div>
        <div className="rail-item">
          <div className="rail-item-title">
            {blockedBuild?.title ?? "No blocking build gates"}
          </div>
          <div className="rail-item-meta">
            {blockedBuild
              ? `Build gate blocking deploy · ${WorkflowStage.InProgress}`
              : "All build gates clear"}
          </div>
        </div>
      </div>
    </>
  );
}

function TaskRailContent({ task }: { task: Task }) {
  const { refresh, source } = useData();
  const [pendingGateKey, setPendingGateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const interactive = source === "supabase";
  const blocking = task.gates.filter((g) => g.required && !g.passed).length;

  async function handleGateToggle(gateKey: string, passed: boolean) {
    setPendingGateKey(gateKey);
    setError(null);
    try {
      await updateGate(task.id, gateKey, passed ? "fail" : "pass");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update gate");
    } finally {
      setPendingGateKey(null);
    }
  }

  return (
    <>
      <div className="rail-section">
        <div className="rail-section-title">Stage tracker</div>
        <div className="rail-item">
          <StageBadge stage={task.stage} />
          <div className="rail-item-meta" style={{ marginTop: 6 }}>
            {task.workflowType} · {task.priority} priority
          </div>
        </div>
      </div>
      <div className="rail-section">
        <div className="rail-section-title">
          Gate checklist {blocking > 0 ? `(${blocking} blocking)` : ""}
        </div>
        <GateList
          gates={task.gates}
          interactive={interactive}
          onToggle={handleGateToggle}
          pendingGateKey={pendingGateKey}
          hint={
            interactive
              ? "Click a gate to pass or reset it."
              : "Gate updates require live Supabase (VITE_USE_LIVE_API=true)."
          }
        />
        {error ? (
          <p className="rail-error" style={{ fontSize: 11, color: "var(--red)", margin: "8px 0 0" }}>
            {error}
          </p>
        ) : null}
      </div>
      {task.githubRef ? (
        <div className="rail-section">
          <div className="rail-section-title">GitHub</div>
          <div className="rail-item mono">{task.githubRef}</div>
        </div>
      ) : null}
      {task.blocker ? (
        <div className="rail-section">
          <div className="rail-section-title">Blocker</div>
          <div className="rail-item">{task.blocker}</div>
        </div>
      ) : null}
    </>
  );
}

function EntityRailContent({ entityId, data }: { entityId: string; data: MockData }) {
  const task = data.tasks.find((t) => t.id === entityId);
  if (task) {
    return <TaskRailContent task={task} />;
  }

  const incident = data.incidents.find((i) => i.id === entityId);
  if (incident) {
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Incident</div>
          <div className="rail-item">
            <SeverityBadge severity={incident.severity} />
            <div className="rail-item-title" style={{ marginTop: 8 }}>
              {incident.title}
            </div>
            <div className="rail-item-meta">{incident.serviceName}</div>
          </div>
        </div>
        <div className="rail-section">
          <div className="rail-section-title">Timeline</div>
          <div className="rail-item">
            <div className="rail-item-meta">Opened {formatRelativeTime(incident.openedAt)}</div>
            <div className="rail-item-meta">Status: {incident.status}</div>
          </div>
        </div>
      </>
    );
  }

  const workflow = data.workflows.find((w) => w.id === entityId);
  if (workflow) {
    const blocking = workflow.gates.filter((g) => g.required && !g.passed).length;
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Workflow</div>
          <div className="rail-item">
            <div className="rail-item-title">{workflow.title}</div>
            <div className="rail-item-meta">
              {workflow.type} · <StageBadge stage={workflow.stage} />
            </div>
          </div>
        </div>
        <div className="rail-section">
          <div className="rail-section-title">
            Gate checklist {blocking > 0 ? `(${blocking} blocking)` : ""}
          </div>
          <GateList gates={workflow.gates} />
        </div>
      </>
    );
  }

  return <DefaultRailContent data={data} />;
}

export function ContextRail({ open, onClose, selectedEntityId }: ContextRailProps) {
  const location = useLocation();
  const { data } = useData();

  if (!open) return null;

  const routeLabels: Record<string, string> = {
    "/": "Today",
    "/dashboard": "Dashboard",
    "/operations": "Operations",
    "/builds": "Builds",
    "/monitor": "Monitor",
    "/repair": "Repair",
    "/customers": "Customers",
    "/knowledge": "AI & Knowledge",
    "/review": "Review",
    "/settings": "Settings",
  };

  return (
    <aside className="context-rail">
      <div className="rail-header">
        <span className="rail-title">
          {selectedEntityId ? "Context" : routeLabels[location.pathname] ?? "Context"}
        </span>
        <button type="button" className="rail-close" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </div>
      <div className="rail-body">
        {selectedEntityId ? (
          <EntityRailContent entityId={selectedEntityId} data={data} />
        ) : (
          <DefaultRailContent data={data} />
        )}
      </div>
    </aside>
  );
}
