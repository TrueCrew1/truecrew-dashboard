"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StageBadge, SeverityBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Database, TaskRow } from "@/types/database";
import { WorkflowStage } from "@/types";

const WIP_LIMIT = 3;

const PRIORITY_MAP: Record<string, string> = {
  normal: "medium",
  high: "high",
  critical: "critical",
  low: "low",
};

function formatTodayDate() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function stageAsEnum(stage: string): WorkflowStage {
  return (Object.values(WorkflowStage) as string[]).includes(stage)
    ? (stage as WorkflowStage)
    : WorkflowStage.Inbox;
}

export function TodayView({
  initialTasks,
  initialIncidents,
}: {
  initialTasks: TaskRow[];
  initialIncidents: {
    id: string;
    title: string;
    severity: number;
    service_name: string;
  }[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [captureTitle, setCaptureTitle] = useState("");
  const [capturePriority, setCapturePriority] = useState("normal");
  const [saving, setSaving] = useState(false);

  const wip = useMemo(
    () => tasks.filter((t) => t.stage === "In Progress"),
    [tasks],
  );

  const focusQueue = useMemo(() => {
    const priorityWeight: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return [...tasks]
      .filter((t) => !["Done", "Logged"].includes(t.stage))
      .sort(
        (a, b) =>
          (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0),
      )
      .slice(0, 8);
  }, [tasks]);

  const blockingTasks = useMemo(
    () =>
      tasks.filter((t) =>
        (t.gate_checks ?? []).some((g) => g.required && !g.passed),
      ),
    [tasks],
  );

  const mit = focusQueue[0] ?? null;
  const wipCount = wip.length;
  const wipClass =
    wipCount >= WIP_LIMIT ? "wip-over" : wipCount === WIP_LIMIT - 1 ? "wip-near" : "wip-ok";

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    const title = captureTitle.trim();
    if (!title || saving) return;

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        priority: PRIORITY_MAP[capturePriority] ?? "medium",
        stage: "Inbox",
        workflow_type: "ticket",
        created_by: "founder",
      } as Database["public"]["Tables"]["tasks"]["Insert"])
      .select("*, gate_checks(*)")
      .single();

    if (!error && data) {
      setTasks((prev) => [data as TaskRow, ...prev]);
      setCaptureTitle("");
      setCapturePriority("normal");
      router.refresh();
    }
    setSaving(false);
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
              <p className="today-mit-reason">{mit.priority} priority · {mit.stage}</p>
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
          <section className="today-zone" aria-labelledby="today-wip-heading">
            <div className="today-zone-header">
              <h2 id="today-wip-heading" className="today-zone-title">
                In Progress
              </h2>
              <span className="today-zone-count">
                {wipCount} / {WIP_LIMIT}
              </span>
            </div>
            <div className="today-zone-body">
              {wip.length ? (
                <ul className="today-list">
                  {wip.map((task) => (
                    <li key={task.id}>
                      <div className="today-list-row today-list-row-static">
                        <div className="today-list-main">
                          <p className="today-list-title">{task.title}</p>
                          <p className="today-list-meta">{task.workflow_type}</p>
                        </div>
                        <div className="today-list-actions">
                          <StageBadge stage={stageAsEnum(task.stage)} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">No items yet</p>
              )}
            </div>
          </section>

          <section className="today-zone" aria-labelledby="today-focus-heading">
            <div className="today-zone-header">
              <h2 id="today-focus-heading" className="today-zone-title">
                Priority Queue
              </h2>
              <span className="today-zone-count">{focusQueue.length}</span>
            </div>
            <div className="today-zone-body">
              {focusQueue.length ? (
                <ul className="today-list">
                  {focusQueue.map((task) => (
                    <li key={task.id}>
                      <div className="today-list-row today-list-row-static">
                        <div className="today-list-main">
                          <p className="today-list-title">{task.title}</p>
                          <p className="today-list-meta">{task.priority} · {task.stage}</p>
                        </div>
                        <div className="today-list-actions">
                          <StageBadge stage={stageAsEnum(task.stage)} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">No items yet</p>
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
                      <div className="today-list-row today-list-row-static">
                        <div className="today-list-main">
                          <p className="today-list-title">{task.title}</p>
                          <p className="today-list-meta">
                            {(task.gate_checks ?? [])
                              .filter((g) => g.required && !g.passed)
                              .map((g) => g.label)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="today-list-actions">
                          <StageBadge stage={stageAsEnum(task.stage)} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">No items yet</p>
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
              <span className="today-zone-count">{initialIncidents.length}</span>
            </div>
            <div className="today-zone-body">
              {initialIncidents.length ? (
                <ul className="today-list">
                  {initialIncidents.map((inc) => (
                    <li key={inc.id}>
                      <div className="today-list-row today-list-row-static">
                        <div className="today-list-main">
                          <p className="today-list-title">{inc.title}</p>
                          <p className="today-list-meta">{inc.service_name}</p>
                        </div>
                        <div className="today-list-actions">
                          <SeverityBadge severity={inc.severity as 1 | 2 | 3 | 4} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">No items yet</p>
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
                <button
                  type="submit"
                  className="today-btn today-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Capture"}
                </button>
              </form>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
