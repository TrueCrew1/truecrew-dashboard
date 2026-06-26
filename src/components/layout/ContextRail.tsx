import { useLocation } from "react-router-dom";
import { mockData } from "@/data/mockData";
import { GateList, SeverityBadge, StageBadge, formatRelativeTime } from "@/components/ui";
import { WorkflowStage } from "@/types";

interface ContextRailProps {
  open: boolean;
  onClose: () => void;
  selectedEntityId?: string | null;
}

function DefaultRailContent() {
  return (
    <>
      <div className="rail-section">
        <div className="rail-section-title">Today's focus</div>
        {mockData.focusItems.map((item) => (
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
        {mockData.alerts.map((alert) => (
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
          <div className="rail-item-title">Billing API — PR review</div>
          <div className="rail-item-meta">
            Build gate blocking deploy · {WorkflowStage.InProgress}
          </div>
        </div>
      </div>
    </>
  );
}

function EntityRailContent({ entityId }: { entityId: string }) {
  const task = mockData.tasks.find((t) => t.id === entityId);
  if (task) {
    const blocking = task.gates.filter((g) => g.required && !g.passed).length;
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
          <GateList gates={task.gates} />
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

  const incident = mockData.incidents.find((i) => i.id === entityId);
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

  const workflow = mockData.workflows.find((w) => w.id === entityId);
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

  return <DefaultRailContent />;
}

export function ContextRail({ open, onClose, selectedEntityId }: ContextRailProps) {
  const location = useLocation();

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
          <EntityRailContent entityId={selectedEntityId} />
        ) : (
          <DefaultRailContent />
        )}
      </div>
    </aside>
  );
}
