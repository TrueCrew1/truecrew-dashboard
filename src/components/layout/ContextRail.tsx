import { useLocation } from "react-router-dom";
import {
  GateList,
  SeverityBadge,
  StageBadge,
  StatusBadge,
  formatRelativeTime,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import type { MockData } from "@/data/mockData";
import { getLinkedCustomer, getTasksForCustomer } from "@/lib/entities";
import type { LinkedEntityRef } from "@/types";
import { WorkflowStage } from "@/types";

interface ContextRailProps {
  open: boolean;
  onClose: () => void;
  selectedEntityId?: string | null;
}

function LinkedEntityButton({
  entity,
  onSelect,
}: {
  entity: LinkedEntityRef;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="linked-entity-btn"
      onClick={() => onSelect(entity.id)}
    >
      <span className="linked-entity-type">{entity.type}</span>
      {entity.label}
    </button>
  );
}

function DefaultRailContent({
  data,
  onSelectEntity,
}: {
  data: MockData;
  onSelectEntity: (id: string) => void;
}) {
  const blockedBuild = data.tasks.find(
    (t) => t.workflowType === "build" && t.gates.some((g) => g.required && !g.passed),
  );

  return (
    <>
      <div className="rail-section">
        <div className="rail-section-title">Today's focus</div>
        {data.focusItems.map((item) => (
          <div
            key={item.id}
            className="rail-item clickable-rail-item"
            role="button"
            tabIndex={0}
            onClick={() => onSelectEntity(item.taskId)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectEntity(item.taskId);
              }
            }}
          >
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
          <div
            key={alert.id}
            className={`rail-item${alert.entityRef ? " clickable-rail-item" : ""}`}
            role={alert.entityRef ? "button" : undefined}
            tabIndex={alert.entityRef ? 0 : undefined}
            onClick={
              alert.entityRef ? () => onSelectEntity(alert.entityRef!.id) : undefined
            }
            onKeyDown={
              alert.entityRef
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectEntity(alert.entityRef!.id);
                    }
                  }
                : undefined
            }
          >
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
        <div
          className={`rail-item${blockedBuild ? " clickable-rail-item" : ""}`}
          role={blockedBuild ? "button" : undefined}
          tabIndex={blockedBuild ? 0 : undefined}
          onClick={blockedBuild ? () => onSelectEntity(blockedBuild.id) : undefined}
          onKeyDown={
            blockedBuild
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectEntity(blockedBuild.id);
                  }
                }
              : undefined
          }
        >
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

function EntityRailContent({
  entityId,
  data,
  onSelectEntity,
}: {
  entityId: string;
  data: MockData;
  onSelectEntity: (id: string) => void;
}) {
  const task = data.tasks.find((t) => t.id === entityId);
  if (task) {
    const blocking = task.gates.filter((g) => g.required && !g.passed).length;
    const customer = getLinkedCustomer(task, data.customers);

    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Task</div>
          <div className="rail-item">
            <div className="rail-item-title">{task.title}</div>
            <div className="rail-item-meta" style={{ marginTop: 6 }}>
              {task.workflowType} · {task.priority} priority
            </div>
            {task.assignee ? (
              <div className="rail-item-meta">Assignee: {task.assignee}</div>
            ) : null}
            {task.dueAt ? (
              <div className="rail-item-meta">Due {formatRelativeTime(task.dueAt)}</div>
            ) : null}
          </div>
        </div>

        {customer ? (
          <div className="rail-section">
            <div className="rail-section-title">Customer</div>
            <div
              className="rail-item clickable-rail-item"
              role="button"
              tabIndex={0}
              onClick={() => onSelectEntity(customer.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectEntity(customer.id);
                }
              }}
            >
              <div className="rail-item-title">{customer.name}</div>
              <div className="rail-item-meta">
                <StatusBadge
                  status={customer.status}
                  variant={
                    customer.status === "active"
                      ? "green"
                      : customer.status === "onboarding"
                        ? "orange"
                        : "steel"
                  }
                />{" "}
                · {customer.tier} · health {customer.healthScore}
              </div>
            </div>
          </div>
        ) : null}

        <div className="rail-section">
          <div className="rail-section-title">Stage tracker</div>
          <div className="rail-item">
            <StageBadge stage={task.stage} />
          </div>
        </div>

        {task.linkedEntities.length > 0 ? (
          <div className="rail-section">
            <div className="rail-section-title">Linked</div>
            <div className="linked-entity-list">
              {task.linkedEntities.map((entity) => (
                <LinkedEntityButton
                  key={`${entity.type}-${entity.id}`}
                  entity={entity}
                  onSelect={onSelectEntity}
                />
              ))}
            </div>
          </div>
        ) : null}

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

  const customer = data.customers.find((c) => c.id === entityId);
  if (customer) {
    const linkedTasks = getTasksForCustomer(customer, data.tasks);

    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Customer</div>
          <div className="rail-item">
            <div className="rail-item-title">{customer.name}</div>
            <div className="rail-item-meta">
              <StatusBadge
                status={customer.status}
                variant={
                  customer.status === "active"
                    ? "green"
                    : customer.status === "onboarding"
                      ? "orange"
                      : "steel"
                }
              />{" "}
              · {customer.tier} tier
            </div>
            <div className="rail-item-meta">Health score: {customer.healthScore}</div>
            <div className="rail-item-meta">{customer.primaryContact}</div>
            <div className="rail-item-meta">{customer.email}</div>
          </div>
        </div>

        {customer.status === "onboarding" ? (
          <div className="rail-section">
            <div className="rail-section-title">Onboarding</div>
            <div className="rail-item">
              <StageBadge stage={customer.stage} />
            </div>
            {customer.onboardingChecklist.length > 0 ? (
              <GateList gates={customer.onboardingChecklist} />
            ) : null}
          </div>
        ) : null}

        <div className="rail-section">
          <div className="rail-section-title">
            Open tickets {linkedTasks.length > 0 ? `(${linkedTasks.length})` : ""}
          </div>
          {linkedTasks.length === 0 ? (
            <div className="rail-item">
              <div className="rail-item-meta">No linked tasks</div>
            </div>
          ) : (
            linkedTasks.map((linkedTask) => (
              <div
                key={linkedTask.id}
                className="rail-item clickable-rail-item"
                role="button"
                tabIndex={0}
                onClick={() => onSelectEntity(linkedTask.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectEntity(linkedTask.id);
                  }
                }}
              >
                <div className="rail-item-title">{linkedTask.title}</div>
                <div className="rail-item-meta">
                  <StageBadge stage={linkedTask.stage} /> · {linkedTask.workflowType}
                </div>
              </div>
            ))
          )}
        </div>
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

  return <DefaultRailContent data={data} onSelectEntity={onSelectEntity} />;
}

export function ContextRail({ open, onClose, selectedEntityId }: ContextRailProps) {
  const location = useLocation();
  const { data } = useData();
  const { setSelectedEntityId } = useSelection();

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

  const handleSelectEntity = (id: string) => setSelectedEntityId(id);

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
          <EntityRailContent
            entityId={selectedEntityId}
            data={data}
            onSelectEntity={handleSelectEntity}
          />
        ) : (
          <DefaultRailContent data={data} onSelectEntity={handleSelectEntity} />
        )}
      </div>
    </aside>
  );
}
