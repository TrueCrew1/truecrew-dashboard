import { FormEvent, useMemo, useState } from "react";
import {
  WIP_LIMIT,
  aiNextStep,
  createTodayItem,
  loadTodayItems,
  saveTodayItems,
  type TodayItem,
  type TodayPriority,
} from "@/lib/today";

function formatTodayDate() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function TodayZone({
  id,
  title,
  count,
  countLabel,
  variant,
  padded,
  children,
}: {
  id: string;
  title: string;
  count?: number | string;
  countLabel?: string;
  variant?: "default" | "danger" | "ai";
  padded?: boolean;
  children: React.ReactNode;
}) {
  const zoneClass = [
    "today-zone",
    variant === "danger" ? "today-zone-danger" : "",
    variant === "ai" ? "today-zone-ai" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const titleClass = [
    "today-zone-title",
    variant === "danger" ? "today-zone-title-danger" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const badgeClass = [
    "today-zone-count",
    variant === "danger" ? "today-zone-count-danger" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={zoneClass} aria-labelledby={id}>
      <div className="today-zone-header">
        <h2 id={id} className={titleClass}>
          {title}
        </h2>
        {countLabel ?? count !== undefined ? (
          <span className={badgeClass}>{countLabel ?? count}</span>
        ) : null}
      </div>
      <div className={`today-zone-body${padded ? " padded" : ""}`}>{children}</div>
    </section>
  );
}

function EmptyZone() {
  return <p className="today-zone-empty">No items yet</p>;
}

export function TodayPage() {
  const [items, setItems] = useState<TodayItem[]>(() => loadTodayItems());
  const [captureTitle, setCaptureTitle] = useState("");
  const [capturePriority, setCapturePriority] = useState<TodayPriority>("normal");
  const [captureDue, setCaptureDue] = useState("");

  const wip = useMemo(
    () => items.filter((i) => i.status === "in_progress"),
    [items],
  );
  const blocked = useMemo(() => items.filter((i) => i.status === "blocked"), [items]);
  const waiting = useMemo(() => items.filter((i) => i.status === "waiting"), [items]);
  const queue = useMemo(() => items.filter((i) => i.status === "open"), [items]);
  const overdue = useMemo(
    () =>
      items.filter(
        (i) =>
          i.dueDate &&
          i.status !== "done" &&
          i.status !== "blocked" &&
          i.status !== "waiting" &&
          new Date(i.dueDate) < new Date(),
      ),
    [items],
  );

  const mit = useMemo(() => {
    const active = items.filter((i) => i.status !== "done");
    return active[0] ?? null;
  }, [items]);

  const wipCount = wip.length;
  const wipClass =
    wipCount >= WIP_LIMIT ? "wip-over" : wipCount === WIP_LIMIT - 1 ? "wip-near" : "wip-ok";
  const nextStep = useMemo(() => aiNextStep(items), [items]);

  function persist(next: TodayItem[]) {
    setItems(next);
    saveTodayItems(next);
  }

  function handleCapture(e: FormEvent) {
    e.preventDefault();
    const title = captureTitle.trim();
    if (!title) return;
    const item = createTodayItem({
      title,
      priority: capturePriority,
      dueDate: captureDue || null,
    });
    persist([item, ...items]);
    setCaptureTitle("");
    setCapturePriority("normal");
    setCaptureDue("");
  }

  return (
    <div className="today-page">
      <section className="today-banner" aria-label="Today overview">
        <div className="today-banner-left">
          <div className="today-banner-meta">
            <p className="today-date">{formatTodayDate()}</p>
            <span className="today-prototype-note">Prototype / Demo</span>
          </div>
          {mit ? (
            <>
              <p className="today-mit-label">Most important now</p>
              <h1 className="today-mit-title">{mit.title}</h1>
            </>
          ) : (
            <>
              <p className="today-mit-label">Most important now</p>
              <h1 className="today-mit-title today-mit-clear">Queue is clear</h1>
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

      {wipCount >= WIP_LIMIT ? (
        <div className="today-alert today-alert-danger" role="alert">
          <strong>WIP limit reached ({wipCount} / {WIP_LIMIT}).</strong> Finish in-progress
          work before starting new items.
        </div>
      ) : null}

      <div className="today-layout">
        <div className="today-main">
          <TodayZone
            id="today-wip-heading"
            title="In Progress"
            countLabel={`${wipCount} / ${WIP_LIMIT}`}
          >
            {wip.length ? (
              <ul className="today-list">
                {wip.map((item) => (
                  <li key={item.id}>
                    <div className="today-list-row today-list-row-static">
                      <div className="today-list-main">
                        <p className="today-list-title">{item.title}</p>
                        <p className="today-list-meta">{item.module}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyZone />
            )}
          </TodayZone>

          <TodayZone id="today-queue-heading" title="Priority Queue" count={queue.length}>
            {queue.length ? (
              <ul className="today-list">
                {queue.map((item) => (
                  <li key={item.id}>
                    <div className="today-list-row today-list-row-static">
                      <div className="today-list-main">
                        <p className="today-list-title">{item.title}</p>
                        <p className="today-list-meta">{item.module}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyZone />
            )}
          </TodayZone>

          <TodayZone
            id="today-overdue-heading"
            title="Overdue"
            count={overdue.length}
            variant={overdue.length ? "danger" : "default"}
          >
            {overdue.length ? (
              <ul className="today-list">
                {overdue.map((item) => (
                  <li key={item.id}>
                    <div className="today-list-row today-list-row-static">
                      <div className="today-list-main">
                        <p className="today-list-title">{item.title}</p>
                        <p className="today-list-meta">{item.module}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyZone />
            )}
          </TodayZone>
        </div>

        <aside className="today-sidebar">
          <TodayZone id="today-next-heading" title="Next action" variant="ai">
            <div className={`today-ai-card today-ai-${nextStep.urgency}`}>
              <p className="today-ai-action">{nextStep.action}</p>
              <p className="today-ai-detail">{nextStep.detail}</p>
            </div>
          </TodayZone>

          <TodayZone
            id="today-blockers-heading"
            title="Blockers"
            count={blocked.length}
            variant={blocked.length ? "danger" : "default"}
          >
            {blocked.length ? (
              <ul className="today-list">
                {blocked.map((item) => (
                  <li key={item.id}>
                    <div className="today-list-row today-list-row-static">
                      <div className="today-list-main">
                        <p className="today-list-title">{item.title}</p>
                        <p className="today-list-meta">{item.blocker}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyZone />
            )}
          </TodayZone>

          <TodayZone id="today-waiting-heading" title="Waiting" count={waiting.length}>
            {waiting.length ? (
              <ul className="today-list">
                {waiting.map((item) => (
                  <li key={item.id}>
                    <div className="today-list-row today-list-row-static">
                      <div className="today-list-main">
                        <p className="today-list-title">{item.title}</p>
                        <p className="today-list-meta">
                          Waiting on: {item.waitingOn ?? "—"}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyZone />
            )}
          </TodayZone>

          <TodayZone id="today-capture-heading" title="Quick capture" padded>
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
                      onChange={(e) => setCapturePriority(e.target.value as TodayPriority)}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="today-field">
                    <label className="today-field-label" htmlFor="today-capture-due">
                      Due date
                    </label>
                    <input
                      id="today-capture-due"
                      className="today-input"
                      type="date"
                      value={captureDue}
                      onChange={(e) => setCaptureDue(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="today-btn today-btn-primary">
                  Capture
                </button>
            </form>
          </TodayZone>
        </aside>
      </div>
    </div>
  );
}
