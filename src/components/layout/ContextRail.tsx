import { useLocation } from "react-router-dom";
import { GateList, SeverityBadge, StageBadge, formatRelativeTime } from "@/components/ui";
import { useData } from "@/context/DataContext";
import type { MockData } from "@/data/mockData";
import { WorkflowStage } from "@/types";

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

function EntityRailContent({ entityId, data }: { entityId: string; data: MockData }) {
  const task = data.tasks.find((t) => t.id === entityId);
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

  const deploy = data.deploys.find((d) => d.id === entityId);
  if (deploy) {
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Deploy</div>
          <div className="rail-item">
            <div className="rail-item-title">{deploy.title}</div>
            <div className="rail-item-meta">
              {deploy.serviceName} · <StageBadge stage={deploy.stage} />
            </div>
            <div className="rail-item-meta mono">{deploy.version}</div>
          </div>
        </div>
        <div className="rail-section">
          <div className="rail-section-title">Rollback plan</div>
          <div className="rail-item">{deploy.rollbackPlan}</div>
        </div>
      </>
    );
  }

  const tool = data.tools.find((t) => t.id === entityId);
  if (tool) {
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Service</div>
          <div className="rail-item">
            <div className="rail-item-title">{tool.name}</div>
            <div className="rail-item-meta">
              {tool.environment} · {tool.status}
            </div>
            {tool.currentVersion ? (
              <div className="rail-item-meta mono">v{tool.currentVersion}</div>
            ) : null}
          </div>
        </div>
        {tool.openIncidentIds.length > 0 ? (
          <div className="rail-section">
            <div className="rail-section-title">Open incidents</div>
            {tool.openIncidentIds.map((id) => {
              const incident = data.incidents.find((i) => i.id === id);
              return incident ? (
                <div key={id} className="rail-item">
                  <SeverityBadge severity={incident.severity} /> {incident.title}
                </div>
              ) : null;
            })}
          </div>
        ) : null}
      </>
    );
  }

  const job = data.jobs.find((j) => j.id === entityId);
  if (job) {
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Job</div>
          <div className="rail-item">
            <div className="rail-item-title">{job.title}</div>
            <div className="rail-item-meta">
              {job.customerName} · {job.status.replace("_", " ")}
            </div>
            {job.assigneeName ? (
              <div className="rail-item-meta">Assigned · {job.assigneeName}</div>
            ) : (
              <div className="rail-item-meta">Unassigned</div>
            )}
          </div>
        </div>
        {job.blocker ? (
          <div className="rail-section">
            <div className="rail-section-title">Blocker</div>
            <div className="rail-item">{job.blocker}</div>
          </div>
        ) : null}
      </>
    );
  }

  const invoice = data.invoices.find((i) => i.id === entityId);
  if (invoice) {
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Invoice</div>
          <div className="rail-item">
            <div className="rail-item-title">{invoice.number}</div>
            <div className="rail-item-meta">
              {invoice.customerName} · {invoice.status}
            </div>
            <div className="rail-item-meta">
              ${(invoice.amountCents / 100).toLocaleString()}
            </div>
          </div>
        </div>
      </>
    );
  }

  const inventory = data.inventory.find((i) => i.id === entityId);
  if (inventory) {
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Inventory</div>
          <div className="rail-item">
            <div className="rail-item-title">{inventory.name}</div>
            <div className="rail-item-meta mono">{inventory.sku}</div>
            <div className="rail-item-meta">
              {inventory.quantity} {inventory.unit} · reorder at {inventory.reorderPoint}
            </div>
            <div className="rail-item-meta">{inventory.location}</div>
          </div>
        </div>
      </>
    );
  }

  const customer = data.customers.find((c) => c.id === entityId);
  if (customer) {
    const checklist = customer.onboardingChecklist.filter((item) => item.required);
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Customer</div>
          <div className="rail-item">
            <div className="rail-item-title">{customer.name}</div>
            <div className="rail-item-meta">
              {customer.tier} · {customer.status} · health {customer.healthScore}
            </div>
          </div>
        </div>
        {checklist.length > 0 ? (
          <div className="rail-section">
            <div className="rail-section-title">Onboarding checklist</div>
            <GateList gates={checklist} />
          </div>
        ) : null}
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
