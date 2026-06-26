/**
 * today.js — True Crew "Today" workspace
 *
 * Purpose: Founder-grade daily operational focus surface.
 * Shows what matters now. Prevents context switching. Surfaces blockers,
 * stale work, overdue records, orphaned items, and the single most
 * important next action. Not motivational — operational.
 *
 * Public exports: renderToday(), bindTodayEvents(), unbindTodayEvents()
 *
 * Priority logic:
 *   base = pinned(+80) + blocked(+70) + stale(+40) + orphaned(+20)
 *        + overdue(+100..+150) | due-today(+60) | due-week(+30)
 *        + priority-weight(0..+50)
 *        + age-weight(min(days*2, 40))
 *
 * WIP rules:
 *   Limit = 3 concurrent in-progress items.
 *   Exceeding the limit triggers an alert and disables the Start action.
 *
 * Stale threshold:  3 days without a status update while in_progress.
 * Orphan threshold: 7 days old with no owner assigned.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY_KEY = "truecrew.today.items";
const TODAY_DEMO_KEY = "truecrew.today.demo_loaded";

export const WIP_LIMIT = 3;
const STALE_DAYS = 3;
const ORPHAN_DAYS = 7;

const PRIORITY_SCORES = Object.freeze({
  critical: 50,
  high: 30,
  normal: 10,
  low: 0,
});

// ─── Demo seed data ───────────────────────────────────────────────────────────
// Clearly labeled demo data. Loaded once per session when no live items exist.
// Replace by connecting operational modules that write to TODAY_KEY.

function buildDemoItems() {
  const now = Date.now();
  const at = (d) => new Date(now + d * 86_400_000).toISOString();

  return [
    {
      id: "tc-demo-001",
      title: "Review incident report #IR-2026-041",
      module: "Records",
      status: "in_progress",
      priority: "critical",
      dueDate: at(-2),
      owner: "Alex Admin",
      blocker: null,
      waitingOn: null,
      createdAt: at(-5),
      updatedAt: at(-3),
      pinned: true,
    },
    {
      id: "tc-demo-002",
      title: "Submit weekly field operations report",
      module: "Records",
      status: "open",
      priority: "high",
      dueDate: at(0),
      owner: "Alex Admin",
      blocker: null,
      waitingOn: null,
      createdAt: at(-7),
      updatedAt: at(-1),
      pinned: false,
    },
    {
      id: "tc-demo-003",
      title: "Schedule preventive maintenance — Generator A",
      module: "Maintenance",
      status: "blocked",
      priority: "high",
      dueDate: at(-1),
      owner: "Alex Admin",
      blocker:
        "Site access authorization pending from facility manager (J. Carver). Requested 4 days ago.",
      waitingOn: null,
      createdAt: at(-6),
      updatedAt: at(-2),
      pinned: false,
    },
    {
      id: "tc-demo-004",
      title: "Follow up with Apex Subcontractors — roof inspection quote",
      module: "Field Service",
      status: "waiting",
      priority: "normal",
      dueDate: at(1),
      owner: "Alex Admin",
      blocker: null,
      waitingOn: "Apex Subcontractors",
      createdAt: at(-4),
      updatedAt: at(-3),
      pinned: false,
    },
    {
      id: "tc-demo-005",
      title: "Update crew certification records — Q2 compliance",
      module: "Records",
      status: "open",
      priority: "high",
      dueDate: at(2),
      owner: "Alex Admin",
      blocker: null,
      waitingOn: null,
      createdAt: at(-3),
      updatedAt: at(-1),
      pinned: false,
    },
    {
      id: "tc-demo-006",
      title: "Inspect HVAC unit — Site B, Building 3",
      module: "Maintenance",
      status: "in_progress",
      priority: "normal",
      dueDate: at(-4),
      owner: "Elliot Employee",
      blocker: null,
      waitingOn: null,
      createdAt: at(-8),
      updatedAt: at(-4),
      pinned: false,
    },
    {
      id: "tc-demo-007",
      title: "Coordinate site access for Thursday field inspection",
      module: "Field Service",
      status: "open",
      priority: "high",
      dueDate: at(0),
      owner: "Alex Admin",
      blocker: null,
      waitingOn: null,
      createdAt: at(-2),
      updatedAt: at(-1),
      pinned: false,
    },
    {
      id: "tc-demo-008",
      title: "Close out work order WO-2026-089",
      module: "Field Service",
      status: "open",
      priority: "normal",
      dueDate: at(-3),
      owner: null,
      blocker: null,
      waitingOn: null,
      createdAt: at(-10),
      updatedAt: at(-8),
      pinned: false,
    },
  ];
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadItems() {
  try {
    const raw = sessionStorage.getItem(TODAY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveItems(items) {
  sessionStorage.setItem(TODAY_KEY, JSON.stringify(items));
}

function getItems() {
  let items = loadItems();
  if (!items) {
    items = sessionStorage.getItem(TODAY_DEMO_KEY) ? [] : buildDemoItems();
    sessionStorage.setItem(TODAY_DEMO_KEY, "1");
    saveItems(items);
  }
  return items;
}

function patchItem(id, delta) {
  const items = getItems();
  const i = items.findIndex((x) => x.id === id);
  if (i === -1) return;
  items[i] = { ...items[i], ...delta, updatedAt: new Date().toISOString() };
  saveItems(items);
}

function addItem(item) {
  const items = getItems();
  items.unshift(item);
  saveItems(items);
}

// ─── Priority scoring ─────────────────────────────────────────────────────────

function daysSince(iso) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : 0;
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function isOverdue(item) {
  return (
    !!item.dueDate &&
    item.status !== "done" &&
    new Date(item.dueDate) < startOfToday()
  );
}

function daysOverdue(item) {
  return isOverdue(item) ? daysSince(item.dueDate) : 0;
}

function isDueToday(item) {
  if (!item.dueDate || item.status === "done") return false;
  return new Date(item.dueDate).toDateString() === new Date().toDateString();
}

function isDueThisWeek(item) {
  if (!item.dueDate || item.status === "done") return false;
  const due = new Date(item.dueDate);
  const now = new Date();
  return due > now && due <= new Date(now.getTime() + 7 * 86_400_000);
}

function isStale(item) {
  return item.status === "in_progress" && daysSince(item.updatedAt) >= STALE_DAYS;
}

function isOrphaned(item) {
  return !item.owner && item.status !== "done" && daysSince(item.createdAt) >= ORPHAN_DAYS;
}

function scoreItem(item) {
  if (item.status === "done") return -Infinity;
  let s = 0;

  if (item.pinned) s += 80;
  if (item.status === "blocked") s += 70;
  if (isStale(item)) s += 40;
  if (isOrphaned(item)) s += 20;

  if (isOverdue(item)) s += 100 + Math.min(daysOverdue(item) * 5, 50);
  else if (isDueToday(item)) s += 60;
  else if (isDueThisWeek(item)) s += 30;

  s += PRIORITY_SCORES[item.priority] ?? 10;
  s += Math.min(daysSince(item.createdAt) * 2, 40);

  return s;
}

function scoreReasons(item) {
  const r = [];
  if (item.pinned) r.push("Pinned");
  if (item.status === "blocked") r.push("Blocked");
  if (isStale(item)) r.push(`Stale — ${daysSince(item.updatedAt)}d no update`);
  if (isOrphaned(item)) r.push("No owner");
  if (isOverdue(item)) r.push(`${daysOverdue(item)}d overdue`);
  else if (isDueToday(item)) r.push("Due today");
  else if (isDueThisWeek(item)) r.push("Due this week");
  return r;
}

// ─── AI next step (rule-based) ────────────────────────────────────────────────
//
// Priority order for recommendation:
//   1. Stale in-progress    — silent execution failure
//   2. Blocked items        — hard stops requiring human intervention
//   3. Oldest overdue       — compounding schedule debt
//   4. WIP at limit         — context switching risk
//   5. Orphaned items       — queue hygiene
//   6. Top open item        — normal execution
//
// This is intentionally deterministic and conservative, not AI-generated.

function aiNextStep(items) {
  const active = items.filter((i) => i.status !== "done");
  const wip = active.filter((i) => i.status === "in_progress");
  const stale = wip.filter(isStale);
  const blocked = active.filter((i) => i.status === "blocked");
  const overdue = active.filter(
    (i) => isOverdue(i) && i.status !== "blocked" && i.status !== "waiting",
  );
  const orphaned = active.filter(isOrphaned);
  const open = active.filter((i) => i.status === "open");

  if (stale.length) {
    const s = stale[0];
    return {
      urgency: "high",
      action: "Update stale in-progress work",
      detail: `"${s.title}" has had no update for ${daysSince(s.updatedAt)} days. Record progress, escalate, or close it. Silent execution is not the same as progress.`,
      targetId: s.id,
    };
  }

  if (blocked.length) {
    const b = blocked[0];
    return {
      urgency: "high",
      action: "Clear a blocker",
      detail: `"${b.title}" cannot progress without intervention. Identify who can unblock it and escalate or reassign now.`,
      targetId: b.id,
    };
  }

  if (overdue.length) {
    const o = overdue.reduce((a, b) => (daysOverdue(b) > daysOverdue(a) ? b : a));
    return {
      urgency: "critical",
      action: "Address oldest overdue item",
      detail: `"${o.title}" is ${daysOverdue(o)} day(s) past due. Complete it, escalate with a documented reason, or reschedule with justification.`,
      targetId: o.id,
    };
  }

  if (wip.length >= WIP_LIMIT) {
    return {
      urgency: "normal",
      action: "Close an in-progress item before starting new work",
      detail: `WIP limit is ${WIP_LIMIT}. Starting additional work before finishing current items splits attention and delays all of them.`,
      targetId: null,
    };
  }

  if (orphaned.length) {
    const o = orphaned[0];
    return {
      urgency: "normal",
      action: "Assign or close orphaned work",
      detail: `"${o.title}" has no owner and is ${daysSince(o.createdAt)} days old. Assign it to someone or close it to keep the queue accurate.`,
      targetId: o.id,
    };
  }

  const top = [...open].sort((a, b) => scoreItem(b) - scoreItem(a))[0];
  if (top) {
    return {
      urgency: "low",
      action: "Start highest-priority open item",
      detail: `"${top.title}" is your top-scored open item. Move it to In Progress.`,
      targetId: top.id,
    };
  }

  return {
    urgency: "low",
    action: "Review your queue",
    detail: "No open items with clear urgency. Verify nothing is missing, mislabeled, or waiting to be captured.",
    targetId: null,
  };
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function shortDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function chip(label, tone) {
  const safe = ["danger", "warning", "success"].includes(tone) ? tone : "success";
  return `<span class="status-chip status-${safe} chip-sm">${esc(label)}</span>`;
}

function priorityChip(p) {
  const tones = { critical: "danger", high: "warning", normal: "success", low: "success" };
  const labels = { critical: "Critical", high: "High", normal: "Normal", low: "Low" };
  return chip(labels[p] ?? p, tones[p] ?? "success");
}

function flag(label, kind) {
  return `<span class="today-flag today-flag-${esc(kind)}">${esc(label)}</span>`;
}

// ─── Zone: Banner (MIT + WIP gauge) ──────────────────────────────────────────

function renderBanner(mit, wipCount, wipOver) {
  const wipClass = wipOver ? "wip-over" : wipCount === WIP_LIMIT - 1 ? "wip-near" : "wip-ok";

  const mitBlock = mit
    ? `<div class="today-mit">
        <span class="today-mit-label">Most important now</span>
        <p class="today-mit-title">${esc(mit.title)}</p>
        <span class="today-mit-context">${esc(scoreReasons(mit).slice(0, 1).join(""))}</span>
       </div>`
    : `<div class="today-mit today-mit-clear">
        <span class="today-mit-label">Most important now</span>
        <p class="today-mit-title">Queue is clear</p>
       </div>`;

  return `
    <div class="today-banner">
      <div class="today-banner-left">
        <p class="today-date">${esc(todayLabel())}</p>
        ${mitBlock}
      </div>
      <div class="today-banner-right">
        <div class="today-wip-gauge ${wipClass}" aria-label="Work in progress: ${wipCount} of ${WIP_LIMIT}">
          <span class="today-wip-count">${wipCount}<span class="today-wip-max"> / ${WIP_LIMIT}</span></span>
          <span class="today-wip-label">In Progress</span>
        </div>
        <button class="button button-secondary" type="button" data-action="today-daily-review">
          Daily review
        </button>
      </div>
    </div>`;
}

// ─── Zone: WIP limit alert ────────────────────────────────────────────────────

function renderWipAlert(count) {
  return `
    <div class="today-alert today-alert-danger" role="alert">
      <strong>WIP limit reached (${count} / ${WIP_LIMIT}).</strong>
      You cannot start new work until an in-progress item is completed, reassigned, or closed.
      Splitting focus across more than ${WIP_LIMIT} concurrent items delays all of them.
    </div>`;
}

// ─── Zone: In Progress ────────────────────────────────────────────────────────

function renderWipCard(item) {
  const staleClass = isStale(item) ? " is-stale" : "";
  const overdueClass = isOverdue(item) ? " is-overdue" : "";

  return `
    <article class="today-wip-card${staleClass}${overdueClass}" data-id="${esc(item.id)}">
      <div class="today-card-head">
        <div class="today-tag-row">
          <span class="today-tag">${esc(item.module)}</span>
          ${priorityChip(item.priority)}
          ${isStale(item) ? flag(`Stale — ${daysSince(item.updatedAt)}d`, "stale") : ""}
          ${isOverdue(item) ? flag(`${daysOverdue(item)}d overdue`, "overdue") : ""}
        </div>
        ${item.pinned ? '<span class="today-pin" title="Pinned to today">⊙</span>' : ""}
      </div>
      <h3 class="today-item-title">${esc(item.title)}</h3>
      <div class="today-item-meta">
        <span>${item.owner ? esc(item.owner) : "Unassigned"}</span>
        ${item.dueDate ? `<span>Due ${esc(shortDate(item.dueDate))}</span>` : ""}
      </div>
      <div class="today-item-actions">
        <button class="button button-primary" data-action="today-done" data-id="${esc(item.id)}">Mark done</button>
        <button class="button button-ghost" data-action="today-block" data-id="${esc(item.id)}">Block</button>
      </div>
    </article>`;
}

function renderWipZone(wip) {
  const body = wip.length
    ? `<div class="today-wip-grid">${wip.map(renderWipCard).join("")}</div>`
    : `<p class="today-zone-empty">No items in progress. Start a priority item from the queue below.</p>`;

  return `
    <section class="today-zone" aria-labelledby="tc-wip-heading">
      <h2 id="tc-wip-heading" class="today-zone-title">
        In Progress
        <span class="today-zone-badge">${wip.length} / ${WIP_LIMIT}</span>
      </h2>
      ${body}
    </section>`;
}

// ─── Zone: Priority queue ─────────────────────────────────────────────────────

function renderQueueRow(item, wipOver) {
  const reasons = scoreReasons(item);

  return `
    <article class="today-queue-row" data-id="${esc(item.id)}">
      <div class="today-queue-body">
        <div class="today-tag-row">
          <span class="today-tag">${esc(item.module)}</span>
          ${priorityChip(item.priority)}
          ${isOverdue(item) ? flag(`${daysOverdue(item)}d overdue`, "overdue") : ""}
          ${isOrphaned(item) ? flag("No owner", "orphan") : ""}
          ${item.pinned ? '<span class="today-pin">⊙</span>' : ""}
        </div>
        <h3 class="today-item-title">${esc(item.title)}</h3>
        <div class="today-item-meta">
          ${item.owner ? `<span>${esc(item.owner)}</span>` : '<span class="color-subtle">Unassigned</span>'}
          ${item.dueDate ? `<span>Due ${esc(shortDate(item.dueDate))}</span>` : ""}
          ${reasons.length ? `<span class="today-reason">${esc(reasons.slice(0, 2).join(" · "))}</span>` : ""}
        </div>
      </div>
      <div class="today-queue-actions">
        ${wipOver
          ? `<button class="button button-ghost" disabled title="WIP limit reached">WIP full</button>`
          : `<button class="button button-secondary" data-action="today-start" data-id="${esc(item.id)}">Start</button>`}
        <button class="button button-ghost" data-action="today-pin" data-id="${esc(item.id)}">${item.pinned ? "Unpin" : "Pin"}</button>
        <button class="button button-ghost" data-action="today-done" data-id="${esc(item.id)}">Done</button>
      </div>
    </article>`;
}

function renderQueueZone(queue, wipOver) {
  const body = queue.length
    ? queue.map((i) => renderQueueRow(i, wipOver)).join("")
    : `<p class="today-zone-empty">No open items in queue. Use quick capture below to add work, or check for items stalled in other states.</p>`;

  return `
    <section class="today-zone" aria-labelledby="tc-queue-heading">
      <h2 id="tc-queue-heading" class="today-zone-title">
        Priority Queue
        <span class="today-zone-badge">${queue.length}</span>
      </h2>
      ${body}
    </section>`;
}

// ─── Zone: Overdue ────────────────────────────────────────────────────────────

function renderOverdueRow(item) {
  return `
    <article class="today-overdue-row${item.status === "in_progress" ? " is-wip" : ""}" data-id="${esc(item.id)}">
      <div class="today-overdue-age">${daysOverdue(item)}<span class="today-overdue-unit">d</span></div>
      <div class="today-queue-body">
        <div class="today-tag-row">
          <span class="today-tag">${esc(item.module)}</span>
          ${priorityChip(item.priority)}
          ${item.status === "in_progress" ? flag("In Progress", "wip") : ""}
        </div>
        <h3 class="today-item-title">${esc(item.title)}</h3>
        <div class="today-item-meta">
          ${item.owner ? `<span>${esc(item.owner)}</span>` : '<span class="color-subtle">Unassigned</span>'}
          <span>Was due ${esc(shortDate(item.dueDate))}</span>
        </div>
      </div>
      <div class="today-queue-actions">
        <button class="button button-secondary" data-action="today-done" data-id="${esc(item.id)}">Done</button>
        <button class="button button-ghost" data-action="today-block" data-id="${esc(item.id)}">Block</button>
      </div>
    </article>`;
}

function renderOverdueZone(overdue) {
  if (!overdue.length) return "";
  const sorted = [...overdue].sort((a, b) => daysOverdue(b) - daysOverdue(a));

  return `
    <section class="today-zone today-zone-danger" aria-labelledby="tc-overdue-heading">
      <h2 id="tc-overdue-heading" class="today-zone-title today-zone-title-danger">
        Overdue
        <span class="today-zone-badge today-badge-danger">${overdue.length}</span>
      </h2>
      ${sorted.map(renderOverdueRow).join("")}
    </section>`;
}

// ─── Zone: Blockers ───────────────────────────────────────────────────────────

function renderBlockerCard(item) {
  return `
    <article class="today-sidebar-card today-blocker-card" data-id="${esc(item.id)}">
      <div class="today-tag-row">
        <span class="today-tag">${esc(item.module)}</span>
        ${priorityChip(item.priority)}
        ${isOverdue(item) ? flag(`${daysOverdue(item)}d overdue`, "overdue") : ""}
      </div>
      <h3 class="today-sidebar-title">${esc(item.title)}</h3>
      ${item.blocker ? `<p class="today-blocker-detail">${esc(item.blocker)}</p>` : ""}
      <div class="today-item-actions">
        <button class="button button-secondary" data-action="today-unblock" data-id="${esc(item.id)}">Clear blocker</button>
        <button class="button button-ghost" data-action="today-done" data-id="${esc(item.id)}">Done</button>
      </div>
    </article>`;
}

function renderBlockersZone(blocked) {
  const hasIssue = blocked.length > 0;
  return `
    <section class="today-zone${hasIssue ? " today-zone-danger" : ""}" aria-labelledby="tc-blockers-heading">
      <h2 id="tc-blockers-heading" class="today-zone-title${hasIssue ? " today-zone-title-danger" : ""}">
        Blockers
        <span class="today-zone-badge${hasIssue ? " today-badge-danger" : ""}">${blocked.length}</span>
      </h2>
      ${blocked.length
        ? blocked.map(renderBlockerCard).join("")
        : '<p class="today-zone-empty">No blockers. All items can proceed.</p>'}
    </section>`;
}

// ─── Zone: Waiting ────────────────────────────────────────────────────────────

function renderWaitingZone(waiting) {
  if (!waiting.length) return "";

  return `
    <section class="today-zone" aria-labelledby="tc-waiting-heading">
      <h2 id="tc-waiting-heading" class="today-zone-title">
        Waiting
        <span class="today-zone-badge">${waiting.length}</span>
      </h2>
      ${waiting
        .map(
          (item) => `
        <article class="today-sidebar-card" data-id="${esc(item.id)}">
          <div class="today-tag-row">
            <span class="today-tag">${esc(item.module)}</span>
            ${priorityChip(item.priority)}
          </div>
          <h3 class="today-sidebar-title">${esc(item.title)}</h3>
          <div class="today-item-meta">
            <span>Waiting on: <strong>${esc(item.waitingOn ?? "—")}</strong></span>
            <span>${daysSince(item.updatedAt)}d elapsed</span>
          </div>
          <div class="today-item-actions">
            <button class="button button-secondary" data-action="today-unblock" data-id="${esc(item.id)}">Mark received</button>
          </div>
        </article>`,
        )
        .join("")}
    </section>`;
}

// ─── Zone: AI / next action ───────────────────────────────────────────────────

function renderAIStep(step) {
  const toneMap = { critical: "danger", high: "warning", normal: "success", low: "success" };
  const tone = toneMap[step.urgency] ?? "success";

  return `
    <section class="today-zone today-zone-ai" aria-labelledby="tc-ai-heading">
      <h2 id="tc-ai-heading" class="today-zone-title">Next action</h2>
      <div class="today-ai-card today-ai-${tone}">
        <div class="today-ai-head">
          ${chip(step.urgency.toUpperCase(), tone)}
          <h3 class="today-ai-action">${esc(step.action)}</h3>
        </div>
        <p class="today-ai-detail">${esc(step.detail)}</p>
        ${step.targetId
          ? `<button class="button button-secondary" data-action="today-scroll" data-id="${esc(step.targetId)}">Show item</button>`
          : ""}
      </div>
    </section>`;
}

// ─── Zone: Quick capture ──────────────────────────────────────────────────────

function renderCapture() {
  return `
    <section class="today-zone" aria-labelledby="tc-capture-heading">
      <h2 id="tc-capture-heading" class="today-zone-title">Quick capture</h2>
      <form id="today-capture" class="today-capture-form" autocomplete="off" novalidate>
        <div class="field">
          <label class="label" for="tc-item-title">Item</label>
          <input
            id="tc-item-title"
            class="input"
            name="title"
            maxlength="120"
            required
            placeholder="What needs to happen?"
          />
        </div>
        <div class="field-row">
          <div class="field">
            <label class="label" for="tc-item-priority">Priority</label>
            <select id="tc-item-priority" class="select" name="priority">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="tc-item-due">Due date</label>
            <input id="tc-item-due" class="input" type="date" name="dueDate" />
          </div>
        </div>
        <button class="button button-primary" type="submit">Capture</button>
      </form>
    </section>`;
}

// ─── Main render ──────────────────────────────────────────────────────────────

export function renderToday() {
  const items = getItems();

  const wip = items.filter((i) => i.status === "in_progress");
  const blocked = items.filter((i) => i.status === "blocked");
  const waiting = items.filter((i) => i.status === "waiting");
  const done = items.filter((i) => i.status === "done");

  // Overdue: items that are past due but not blocked/waiting/done
  const overdueActive = items.filter(
    (i) =>
      isOverdue(i) &&
      i.status !== "blocked" &&
      i.status !== "waiting" &&
      i.status !== "done",
  );

  // Queue: open items that are not yet overdue, sorted by score descending
  const queue = items
    .filter((i) => i.status === "open" && !isOverdue(i))
    .sort((a, b) => scoreItem(b) - scoreItem(a));

  // MIT: top-scored non-done item across all states
  const mit = [...items]
    .filter((i) => i.status !== "done")
    .sort((a, b) => scoreItem(b) - scoreItem(a))[0] ?? null;

  const wipOver = wip.length >= WIP_LIMIT;
  const step = aiNextStep(items);

  window.TrueCrew?.audit?.record("today.viewed", { total: items.length, wip: wip.length });

  return `
    ${renderBanner(mit, wip.length, wipOver)}
    ${wipOver ? renderWipAlert(wip.length) : ""}
    <div class="today-layout">
      <div class="today-main">
        ${renderWipZone(wip)}
        ${renderQueueZone(queue, wipOver)}
        ${renderOverdueZone(overdueActive)}
      </div>
      <div class="today-sidebar">
        ${renderAIStep(step)}
        ${renderBlockersZone(blocked)}
        ${renderWaitingZone(waiting)}
        ${renderCapture()}
        ${done.length ? `<p class="today-done-note">${done.length} item${done.length !== 1 ? "s" : ""} completed this session</p>` : ""}
      </div>
    </div>
    <p class="today-demo-note">Demo data active — replace with live module records when operational modules connect to this view.</p>`;
}

// ─── Event binding ────────────────────────────────────────────────────────────

let _delegateBound = false;

export function bindTodayEvents() {
  bindCapture();
  if (!_delegateBound) {
    document.addEventListener("click", onTodayClick);
    _delegateBound = true;
  }
}

export function unbindTodayEvents() {
  document.removeEventListener("click", onTodayClick);
  _delegateBound = false;
}

function bindCapture() {
  document.getElementById("today-capture")?.addEventListener("submit", onCapture);
}

function onTodayClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  const handlers = {
    "today-start": () => onStart(id),
    "today-done": () => onDone(id),
    "today-block": () => onBlock(id),
    "today-unblock": () => onUnblock(id),
    "today-pin": () => onPin(id),
    "today-scroll": () => onScroll(id),
    "today-daily-review": onDailyReview,
  };

  handlers[action]?.();
}

function rerender() {
  const main = document.getElementById("main-content");
  if (!main) return;
  main.innerHTML = renderToday();
  bindCapture();
}

function toast(title, msg) {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const el = document.createElement("section");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<strong>${esc(title)}</strong><p>${esc(msg)}</p>`;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function newId() {
  return (
    window.crypto?.randomUUID?.() ??
    `tc-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

// ─── Interaction handlers ─────────────────────────────────────────────────────

function onStart(id) {
  const items = getItems();
  if (items.filter((i) => i.status === "in_progress").length >= WIP_LIMIT) {
    toast("WIP limit reached", "Complete or reassign an in-progress item first.");
    return;
  }
  patchItem(id, { status: "in_progress" });
  window.TrueCrew?.audit?.record("today.started", { id });
  toast("Started", "Item moved to In Progress.");
  rerender();
}

function onDone(id) {
  patchItem(id, { status: "done" });
  window.TrueCrew?.audit?.record("today.done", { id });
  toast("Done", "Item marked complete.");
  rerender();
}

function onBlock(id) {
  // Production: replace prompt() with an inline textarea modal
  const reason = prompt("Describe what is blocking progress on this item:");
  if (reason === null) return;
  patchItem(id, {
    status: "blocked",
    blocker: String(reason).trim().slice(0, 240) || "No details provided.",
  });
  window.TrueCrew?.audit?.record("today.blocked", { id });
  toast("Blocked", "Item moved to Blockers. Address the blocker or escalate.");
  rerender();
}

function onUnblock(id) {
  patchItem(id, { status: "open", blocker: null, waitingOn: null });
  window.TrueCrew?.audit?.record("today.unblocked", { id });
  toast("Unblocked", "Item returned to priority queue.");
  rerender();
}

function onPin(id) {
  const item = getItems().find((i) => i.id === id);
  if (!item) return;
  const next = !item.pinned;
  patchItem(id, { pinned: next });
  toast(next ? "Pinned to today" : "Unpinned", next ? "Score boosted — item will rank higher." : "Pin removed.");
  rerender();
}

function onScroll(id) {
  document.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function onDailyReview() {
  const items = getItems();
  const issues = [];
  if (items.filter((i) => isOverdue(i) && i.status !== "done").length)
    issues.push(`${items.filter((i) => isOverdue(i) && i.status !== "done").length} overdue`);
  if (items.filter((i) => i.status === "blocked").length)
    issues.push(`${items.filter((i) => i.status === "blocked").length} blocked`);
  if (items.filter(isStale).length)
    issues.push(`${items.filter(isStale).length} stale`);
  if (items.filter(isOrphaned).length)
    issues.push(`${items.filter(isOrphaned).length} unowned`);

  toast(
    "Daily review",
    issues.length
      ? `Address today: ${issues.join(", ")}.`
      : "No critical issues. Queue is in order.",
  );
}

function onCapture(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = new FormData(form);
  const title = String(data.get("title") ?? "").trim().slice(0, 120);
  const priority = ["critical", "high", "normal", "low"].includes(data.get("priority"))
    ? data.get("priority")
    : "normal";
  const rawDate = data.get("dueDate");
  const dueDate = rawDate ? new Date(rawDate).toISOString() : null;

  if (!title) {
    toast("Nothing captured", "Enter a title before capturing.");
    return;
  }

  const now = new Date().toISOString();
  const user = window.TrueCrew?.auth?.currentUser?.();

  addItem({
    id: newId(),
    title,
    module: "Captured",
    status: "open",
    priority,
    dueDate,
    owner: user?.name ?? null,
    blocker: null,
    waitingOn: null,
    createdAt: now,
    updatedAt: now,
    pinned: false,
  });

  window.TrueCrew?.audit?.record("today.captured", { title: title.slice(0, 40) });
  form.reset();
  toast("Captured", `"${title}" added to priority queue.`);
  rerender();
}
