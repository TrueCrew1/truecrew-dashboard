import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  AdvanceButton,
  GateList,
  SeverityBadge,
  StageBadge,
  formatRelativeTime,
  getNextWorkflowStage,
} from "@/components/ui";
import { ArtifactExistsError, useData } from "@/context/DataContext";
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

function TaskRailAdvance({ task }: { task: Task }) {
  const { updateTaskStage, isTaskUpdating } = useData();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const blocking = task.gates.filter((g) => g.required && !g.passed);
  const nextStage = getNextWorkflowStage(task.stage);

  if (blocking.length > 0) {
    return (
      <div className="rail-advance-card blocked">
        <div className="rail-advance-title">Gates blocking advance</div>
        <div className="rail-item-meta">
          {blocking.length} required gate{blocking.length === 1 ? "" : "s"} open
        </div>
      </div>
    );
  }

  if (!nextStage) return null;

  const handleAdvance = async () => {
    setError(null);
    setSaved(false);
    try {
      await updateTaskStage(task.id, nextStage);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="rail-advance-card ready">
      <div className="rail-advance-title">Ready to advance</div>
      <div className="rail-item-meta">All required gates clear · next: {nextStage}</div>
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

function TaskArtifactsRail({ task }: { task: Task }) {
  const { getTaskArtifacts, createTaskArtifact, isArtifactCreating } = useData();
  const [useAi, setUseAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const artifacts = getTaskArtifacts(task.id);
  const creating = isArtifactCreating(task.id);
  const hasArtifact = artifacts.length > 0;

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await createTaskArtifact(task.id, { useAi });
      setSuccess(
        result.vaultWritten
          ? "Artifact indexed and written to vault"
          : "Artifact indexed (vault not available here)",
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof ArtifactExistsError) {
        setError("This task already has an artifact");
      } else {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    }
  };

  return (
    <div className="rail-section">
      <div className="rail-section-title">Artifacts (Librarian)</div>
      {artifacts.length === 0 ? (
        <div className="rail-item">
          <div className="rail-item-meta">No Obsidian artifact linked to this task yet.</div>
        </div>
      ) : (
        artifacts.map((artifact) => (
          <div key={artifact.id} className="rail-item">
            <div className="rail-item-title">{artifact.title}</div>
            <div className="rail-item-meta mono">{artifact.targetPath}</div>
            <div className="rail-item-meta">
              {artifact.refinementSource ?? "deterministic"} · {artifact.tags.slice(0, 3).join(", ")}
            </div>
            <Link to="/knowledge" className="empty-state-link">
              View in Knowledge
            </Link>
          </div>
        ))
      )}
      {!hasArtifact ? (
        <>
          <label className="librarian-option">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              disabled={creating}
            />
            Use AI refinement (optional, falls back if unavailable)
          </label>
          <AdvanceButton
            label="Create artifact"
            onClick={handleCreate}
            disabled={creating}
            loading={creating}
            error={error}
          />
        </>
      ) : null}
      {success ? (
        <span className="stage-select-status saved" aria-live="polite">
          {success}
        </span>
      ) : null}
      {error && hasArtifact ? (
        <span className="stage-select-error">{error}</span>
      ) : null}
    </div>
  );
}

function TaskMaintenanceRail({ task }: { task: Task }) {
  const { createMaintenanceNote, isMaintenanceNoteCreating, getTaskMaintenanceNote } =
    useData();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const creating = isMaintenanceNoteCreating(task.id);
  const maintenanceNote = getTaskMaintenanceNote(task.id);

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await createMaintenanceNote(task.id);
      setSuccess(
        result.vaultWritten
          ? "Maintenance note indexed and written to vault"
          : "Maintenance note indexed (vault not available here)",
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  return (
    <div className="rail-section">
      <div className="rail-section-title">Maintenance</div>
      {maintenanceNote ? (
        <div className="rail-item">
          <div className="rail-item-title">Maintenance note filed</div>
          <div className="rail-item-meta">{maintenanceNote.title}</div>
          <div className="rail-item-meta mono">{maintenanceNote.obsidianPath}</div>
          <Link to="/knowledge" className="empty-state-link">
            View in Knowledge
          </Link>
        </div>
      ) : (
        <>
          <div className="rail-item">
            <div className="rail-item-meta">
              File a maintenance note for this task in Obsidian and the notes index.
            </div>
          </div>
          <AdvanceButton
            label="Create maintenance note"
            onClick={handleCreate}
            disabled={creating}
            loading={creating}
            error={error}
          />
        </>
      )}
      {success ? (
        <span className="stage-select-status saved" aria-live="polite">
          {success}
        </span>
      ) : null}
    </div>
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
        <TaskArtifactsRail task={task} />
        <TaskMaintenanceRail task={task} />
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
