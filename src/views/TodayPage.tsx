import { FormEvent, useMemo, useState } from "react";
import { StageBadge, SeverityBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { WorkflowStage } from "@/types";

const WIP_LIMIT = 3;

function formatTodayDate() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function TodayPage() {
  const { setSelectedEntityId, selectedEntityId } = useSelection();
  const { data } = useData();
  const [captureTitle, setCaptureTitle] = useState("");
  const [capturePriority, setCapturePriority] = useState("normal");

  const mit = data.focusItems[0] ?? null;

  const wipCount = useMemo(
    () => data.tasks.filter((t) => t.stage === WorkflowStage.InProgress).length,
    [data.tasks],
  );

  const wipClass =
    wipCount >= WIP_LIMIT ? "wip-over" : wipCount === WIP_LIMIT - 1 ? "wip-near" : "wip-ok";

  const blockingTasks = data.tasks.filter((t) =>
    t.gates.some((g) => g.required && !g.passed),
  );

  const activeIncidents = data.incidents.filter((i) => i.severity <= 2);

  function handleCapture(e: FormEvent) {
    e.preventDefault();
    setCaptureTitle("");
    setCapturePriority("normal");
  }

  return (
    <div className="today-page">
      <section className="today-banner" aria-label="Today overview">
        <div className="today-banner-left">
          <p className="today-date">{formatTodayDate()}</p>
          {mit ? (
            <>
              <p className="today-mit-label">Most important now</p>
              <h1 className="today-mit-title">{mit.title}</h1>
              <p className="today-mit-reason">{mit.reason}</p>
            </>
          ) : (
            <>
              <p className="today-mit-label">Most important now</p>
              <h1 className="today-mit-title">Queue is clear</h1>
            </>
          )}
        </div>
        <div className="today-banner-right">
          <div
            className={`today-wip-gauge ${wipClass}`}
            aria-label={`Work in progress: ${wipCount} of ${WIP_LIMIT}`}
          >
            <span className="today-wip-count">
              {wipCount}
              <span className="today-wip-max"> / {WIP_LIMIT}</span>
            </span>
            <span className="today-wip-label">In progress</span>
          </div>
          <button type="button" className="today-btn today-btn-ghost">
            Daily review
          </button>
        </div>
      </section>

      <div className="today-layout">
        <div className="today-main">
          <section className="today-zone" aria-labelledby="today-focus-heading">
            <div className="today-zone-header">
              <h2 id="today-focus-heading" className="today-zone-title">
                Focus queue
              </h2>
              <span className="today-zone-count">{data.focusItems.length}</span>
            </div>
            <div className="today-zone-body">
              {data.focusItems.length ? (
                <ul className="today-list">
                  {data.focusItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`today-list-row${selectedEntityId === item.taskId ? " active" : ""}`}
                        onClick={() => setSelectedEntityId(item.taskId)}
                      >
                        <div className="today-list-main">
                          <p className="today-list-title">{item.title}</p>
                          <p className="today-list-meta">{item.reason}</p>
                        </div>
                        <div className="today-list-actions">
                          <StageBadge stage={item.stage} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">No focus items in queue.</p>
              )}
            </div>
          </section>

          <section className="today-zone" aria-labelledby="today-gates-heading">
            <div className="today-zone-header">
              <h2 id="today-gates-heading" className="today-zone-title">
                Blocking gates
              </h2>
              <span className="today-zone-count">{blockingTasks.length}</span>
            </div>
            <div className="today-zone-body">
              {blockingTasks.length ? (
                <ul className="today-list">
                  {blockingTasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        className={`today-list-row${selectedEntityId === task.id ? " active" : ""}`}
                        onClick={() => setSelectedEntityId(task.id)}
                      >
                        <div className="today-list-main">
                          <p className="today-list-title">{task.title}</p>
                          <p className="today-list-meta">
                            {task.gates
                              .filter((g) => g.required && !g.passed)
                              .map((g) => g.label)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="today-list-actions">
                          <StageBadge stage={task.stage} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">No blocking gates.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="today-sidebar">
          <section className="today-zone" aria-labelledby="today-incidents-heading">
            <div className="today-zone-header">
              <h2 id="today-incidents-heading" className="today-zone-title">
                Active incidents
              </h2>
              <span className="today-zone-count">{activeIncidents.length}</span>
            </div>
            <div className="today-zone-body">
              {activeIncidents.length ? (
                <ul className="today-list">
                  {activeIncidents.map((inc) => (
                    <li key={inc.id}>
                      <button
                        type="button"
                        className={`today-list-row${selectedEntityId === inc.id ? " active" : ""}`}
                        onClick={() => setSelectedEntityId(inc.id)}
                      >
                        <div className="today-list-main">
                          <p className="today-list-title">{inc.title}</p>
                          <p className="today-list-meta">{inc.serviceName}</p>
                        </div>
                        <div className="today-list-actions">
                          <SeverityBadge severity={inc.severity} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">No Sev 1–2 incidents.</p>
              )}
            </div>
          </section>

          <section className="today-zone" aria-labelledby="today-capture-heading">
            <div className="today-zone-header">
              <h2 id="today-capture-heading" className="today-zone-title">
                Quick capture
              </h2>
            </div>
            <div className="today-zone-body padded">
              <form className="today-capture-form" onSubmit={handleCapture} noValidate>
                <div className="today-field">
                  <label className="today-field-label" htmlFor="today-capture-title">
                    Item
                  </label>
                  <input
                    id="today-capture-title"
                    className="today-input"
                    type="text"
                    value={captureTitle}
                    onChange={(e) => setCaptureTitle(e.target.value)}
                    placeholder="What needs to happen?"
                    maxLength={120}
                  />
                </div>
                <div className="today-field-row">
                  <div className="today-field">
                    <label className="today-field-label" htmlFor="today-capture-priority">
                      Priority
                    </label>
                    <select
                      id="today-capture-priority"
                      className="today-select"
                      value={capturePriority}
                      onChange={(e) => setCapturePriority(e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="today-btn today-btn-primary">
                  Capture
                </button>
              </form>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
