import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AdvanceButton,
  GateList,
  SeverityBadge,
  StageBadge,
  formatRelativeTime,
  getNextWorkflowStage,
} from "@/components/ui";
import { useConfirm } from "@/components/ui/ConfirmModal";
import {
  CLOSEOUT_STAGES,
  formatOpenGateSummary,
  getBlockingGates,
  resolveStageChange,
  stageChangeRequiresGateWarning,
} from "../../../lib/stage-change";
import { resolveTaskContextFromTask } from "../../../lib/task-context";
import { TaskContextMeta } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import type { MockData } from "@/data/mockData";
import type { Task } from "@/types";
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
        {data.focusItems.length === 0 ? (
          <div className="rail-item">
            <div className="rail-item-meta">Focus queue is clear — nothing needs attention.</div>
          </div>
        ) : (
          data.focusItems.map((item) => (
            <div key={item.id} className="rail-item">
              <div className="rail-item-title">{item.title}</div>
              <div className="rail-item-meta">
                <StageBadge stage={item.stage} /> · {item.reason}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rail-section">
        <div className="rail-section-title">Open alerts</div>
        {data.alerts.length === 0 ? (
          <div className="rail-item">
            <div className="rail-item-meta">No open alerts.</div>
          </div>
        ) : (
          data.alerts.map((alert) => (
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
          ))
        )}
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

function TaskRailAdvance({ task }: { task: Task }) {
  const { updateTaskStage, isTaskUpdating } = useData();
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const blocking = getBlockingGates(task.gates);
  const nextStage = getNextWorkflowStage(task.stage);

  if (!nextStage) return null;

  const needsGateWarning =
    stageChangeRequiresGateWarning(nextStage) && blocking.length > 0;
  const needsCloseoutConfirm = CLOSEOUT_STAGES.has(nextStage);

  const handleAdvance = async () => {
    setError(null);
    setSaved(false);

    const confirmed = await resolveStageChange(nextStage, blocking, (options) =>
      confirm(options),
    );
    if (!confirmed) return;

    try {
      await updateTaskStage(task.id, nextStage);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (needsGateWarning) {
    return (
      <div className="rail-advance-card blocked">
        <div className="rail-advance-title">Open gates before {nextStage}</div>
        <div className="rail-item-meta">{formatOpenGateSummary(blocking)}</div>
        <AdvanceButton
          label={`Advance to ${nextStage} anyway →`}
          onClick={handleAdvance}
          disabled={isTaskUpdating(task.id)}
          loading={isTaskUpdating(task.id)}
          error={error}
        />
        {saved ? (
          <span className="stage-select-status saved" aria-live="polite">
            Stage updated
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rail-advance-card ready">
      <div className="rail-advance-title">
        {needsCloseoutConfirm ? "Ready to close out" : "Ready to advance"}
      </div>
      <div className="rail-item-meta">
        {needsCloseoutConfirm
          ? `Confirm before moving to ${nextStage}`
          : `Next: ${nextStage}${blocking.length > 0 ? " · gates still open on this task" : ""}`}
      </div>
      <AdvanceButton
        label={`Advance to ${nextStage} →`}
        onClick={handleAdvance}
        disabled={isTaskUpdating(task.id)}
        loading={isTaskUpdating(task.id)}
        error={error}
      />
      {saved ? (
        <span className="stage-select-status saved" aria-live="polite">
          Stage updated
        </span>
      ) : null}
    </div>
  );
}

function EntityRailContent({ entityId, data }: { entityId: string; data: MockData }) {
  const task = data.tasks.find((t) => t.id === entityId);
  if (task) {
    const blocking = getBlockingGates(task.gates).length;
    const context = resolveTaskContextFromTask(task, {
      customers: data.customers,
      workflows: data.workflows,
    });
    return (
      <>
        <div className="rail-section">
          <div className="rail-section-title">Stage tracker</div>
          <div className="rail-item">
            <div className="rail-item-title">{task.title}</div>
            <div style={{ marginTop: 4 }}>
              <TaskContextMeta context={context} />
            </div>
            <div className="rail-item-meta" style={{ marginTop: 8 }}>
              <StageBadge stage={task.stage} />
              {" · "}
              {task.workflowType} · {task.priority} priority
            </div>
            <div className="rail-item-meta" style={{ marginTop: 4 }}>
              Last updated {formatRelativeTime(task.updatedAt)}
            </div>
          </div>
        </div>
        <div className="rail-section">
          <div className="rail-section-title">
            Gate checklist {blocking > 0 ? `(${blocking} blocking)` : ""}
          </div>
          <GateList gates={task.gates} />
          <TaskRailAdvance task={task} />
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
            <div className="rail-item-meta" style={{ marginTop: 4 }}>
              {deploy.environment} · v{deploy.version}
            </div>
          </div>
        </div>
        {deploy.rollbackPlan ? (
          <div className="rail-section">
            <div className="rail-section-title">Rollback plan</div>
            <div className="rail-item">
              <div className="rail-item-meta">{deploy.rollbackPlan}</div>
            </div>
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
