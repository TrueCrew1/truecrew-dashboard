const SESSION_KEY = "truecrew.session";
const AUDIT_KEY = "truecrew.audit";
const SEARCH_MIN_LENGTH = 2;

const roles = Object.freeze({
  admin: {
    label: "Admin",
    description: "Full shell access with administration and audit visibility.",
  },
  employee: {
    label: "Employee",
    description: "Operational shell access for assigned work and records.",
  },
});

const appState = {
  user: readSession(),
  sidebarOpen: false,
};

const routes = [
  {
    id: "dashboard",
    path: "/",
    label: "Command Center",
    section: "Workspace",
    icon: "01",
    roles: ["admin", "employee"],
    render: renderDashboard,
  },
  {
    id: "workspace",
    path: "/workspace",
    label: "Assigned Work",
    section: "Workspace",
    icon: "02",
    roles: ["admin", "employee"],
    render: renderWorkspace,
  },
  {
    id: "records",
    path: "/records",
    label: "Records",
    section: "Workspace",
    icon: "03",
    roles: ["admin", "employee"],
    render: renderRecords,
  },
  {
    id: "admin",
    path: "/admin",
    label: "Administration",
    section: "Admin",
    icon: "04",
    roles: ["admin"],
    render: renderAdmin,
  },
  {
    id: "audit",
    path: "/audit",
    label: "Audit Log",
    section: "Admin",
    icon: "05",
    roles: ["admin"],
    render: renderAudit,
  },
];

const foundationApi = Object.freeze({
  audit: {
    record: recordAuditEvent,
    list: listAuditEvents,
  },
  auth: {
    currentUser: () => appState.user,
    hasRole,
  },
  forms: {
    sanitizeText,
    validateRequired,
  },
  http: {
    secureFetch,
  },
});

window.TrueCrew = foundationApi;

window.addEventListener("hashchange", renderApp);
document.addEventListener("DOMContentLoaded", renderApp);

function renderApp() {
  if (!appState.user) {
    renderAuthScreen();
    return;
  }

  const activeRoute = getActiveRoute();
  renderShell(activeRoute);
}

function renderAuthScreen() {
  const app = getApp();
  app.innerHTML = `
    <main class="auth-screen">
      <section class="auth-panel" aria-labelledby="auth-title">
        <div class="auth-hero">
          ${brandMark()}
          <p class="eyebrow">Protected operations shell</p>
          <h1 id="auth-title">Field execution starts from a controlled workspace.</h1>
          <p>
            True Crew is structured for operational teams that need dependable records,
            clear permissions, and a stable foundation for maintenance and service workflows.
          </p>
          <div class="auth-metrics" aria-label="Foundation capabilities">
            <div class="auth-metric">
              <strong>Access</strong>
              <span>Protected shell with role-aware route visibility.</span>
            </div>
            <div class="auth-metric">
              <strong>Records</strong>
              <span>Reusable page, table, form, and state patterns.</span>
            </div>
            <div class="auth-metric">
              <strong>Control</strong>
              <span>Audit hooks and secure request defaults for later modules.</span>
            </div>
          </div>
        </div>
        <div class="auth-form-wrap">
          <p class="eyebrow">Access profile</p>
          <h2>Enter workspace</h2>
          <p>Use an assigned role to open the protected application shell.</p>
          <form id="auth-form" class="form" autocomplete="off" novalidate>
            <div class="field">
              <label class="label" for="display-name">Name</label>
              <input
                class="input"
                id="display-name"
                name="displayName"
                maxlength="80"
                minlength="2"
                required
                inputmode="text"
                autocomplete="name"
                placeholder="Operations manager"
              />
              <span class="help-text">Used for local shell attribution and audit entries.</span>
            </div>
            <div class="field">
              <label class="label" for="role">Role</label>
              <select class="select" id="role" name="role" required>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
              <span class="help-text">Route visibility changes according to selected role.</span>
            </div>
            <button class="button button-primary" type="submit">Open protected shell</button>
          </form>
        </div>
      </section>
    </main>
  `;

  document.getElementById("auth-form").addEventListener("submit", handleSignIn);
}

function renderShell(activeRoute) {
  const app = getApp();
  const visibleRoutes = getVisibleRoutes();
  const route = activeRoute.route;
  const content = activeRoute.status === "ok" ? route.render() : renderRouteState(activeRoute);

  app.innerHTML = `
    <div class="shell">
      <aside id="sidebar" class="sidebar ${appState.sidebarOpen ? "is-open" : ""}" aria-label="Primary navigation">
        <div class="sidebar-header">${brandMark()}</div>
        <nav class="nav">
          ${renderNavigation(visibleRoutes, route)}
        </nav>
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="avatar" aria-hidden="true">${getInitials(appState.user.name)}</div>
            <div>
              <p class="user-name">${escapeHtml(appState.user.name)}</p>
              <p class="user-role">${escapeHtml(roles[appState.user.role].label)}</p>
            </div>
          </div>
          <button id="sign-out" class="button button-secondary" type="button">Sign out</button>
        </div>
      </aside>
      <div class="main-column">
        <header class="topbar">
          <button
            id="menu-toggle"
            class="button button-secondary menu-button"
            type="button"
            aria-controls="sidebar"
            aria-expanded="${String(appState.sidebarOpen)}"
          >
            Menu
          </button>
          <form id="global-search" class="search-shell" role="search">
            <label class="sr-only" for="search-input">Global search</label>
            <input
              id="search-input"
              class="input"
              type="search"
              minlength="${SEARCH_MIN_LENGTH}"
              maxlength="120"
              placeholder="Search shell placeholder"
              autocomplete="off"
            />
          </form>
          <div class="topbar-actions">
            <span class="role-chip">${escapeHtml(roles[appState.user.role].label)}</span>
            <button id="toast-check" class="button button-ghost" type="button">Notify</button>
          </div>
        </header>
        <main id="main-content" class="page-container" tabindex="-1">
          ${content}
        </main>
      </div>
    </div>
  `;

  bindShellEvents();
}

function renderNavigation(visibleRoutes, activeRoute) {
  const sections = [...new Set(visibleRoutes.map((route) => route.section))];

  return sections
    .map((section) => {
      const links = visibleRoutes
        .filter((route) => route.section === section)
        .map(
          (route) => `
            <a
              class="nav-link"
              href="#${route.path}"
              ${route.id === activeRoute.id ? 'aria-current="page"' : ""}
            >
              <span class="nav-icon" aria-hidden="true">${route.icon}</span>
              <span>${route.label}</span>
              <span class="nav-meta">${route.roles.includes("admin") && route.roles.length === 1 ? "Admin" : "Core"}</span>
            </a>
          `,
        )
        .join("");

      return `<p class="nav-section">${section}</p>${links}`;
    })
    .join("");
}

function renderDashboard() {
  return `
    ${pageHeader({
      kicker: "Application foundation",
      title: "Command Center",
      description:
        "A protected operational shell with reusable patterns ready for maintenance, field-service, and administrative modules.",
      actions: `<a class="button button-primary" href="#/workspace">Open workspace</a>`,
    })}
    <section class="grid grid-3" aria-label="Foundation status">
      ${metricCard("Protected shell", "Active", "Session-gated routing is enabled.")}
      ${metricCard("Role controls", appState.user.role === "admin" ? "Admin" : "Employee", "Navigation reflects the active role.")}
      ${metricCard("Audit hooks", "Ready", "Client-side audit plumbing is available for future modules.")}
    </section>
    <section class="grid grid-2 stacked-section">
      ${card({
        title: "Reusable page patterns",
        badge: statusChip("Configured", "success"),
        body: `
          ${filtersToolbar()}
          ${emptyState({
            icon: "TC",
            title: "No operational records yet",
            copy: "Later modules can mount tables, forms, filters, and status chips here without changing the shell.",
          })}
        `,
      })}
      ${card({
        title: "Security defaults",
        badge: statusChip("On", "success"),
        body: `
          <div class="grid">
            ${statusRow("Form handling", "Required fields, length limits, text sanitization, and autocomplete controls are in place.")}
            ${statusRow("API handling", "Same-origin request helper defaults to JSON headers and credentialed requests.")}
            ${statusRow("Auditability", "Route and access events can be recorded with actor, role, timestamp, and metadata.")}
          </div>
        `,
      })}
    </section>
  `;
}

function renderWorkspace() {
  return `
    ${pageHeader({
      kicker: "Employee workspace",
      title: "Assigned Work",
      description:
        "A controlled surface for work queues, task details, and field execution records when operational modules are added.",
      actions: `<button class="button button-secondary" type="button" data-toast="Work creation belongs to the next requested module.">New record</button>`,
    })}
    ${filtersToolbar()}
    ${tableShell({
      columns: ["Record", "Status", "Owner", "Updated"],
      rows: [],
      emptyTitle: "No assigned work records",
      emptyCopy: "This foundation does not ship production sample work orders. Module data can attach here through the shared table pattern.",
    })}
  `;
}

function renderRecords() {
  return `
    ${pageHeader({
      kicker: "Structured records",
      title: "Records",
      description:
        "A standard place for module-owned records with consistent filters, statuses, empty states, and error handling.",
      actions: `<button class="button button-secondary" type="button" data-toast="Record imports are reserved for module implementation.">Import</button>`,
    })}
    <section class="grid grid-2">
      ${card({
        title: "Loading state",
        body: loadingState("Records will show a deterministic loading pattern while module data is requested."),
      })}
      ${card({
        title: "Error state",
        body: errorState("Record source unavailable", "Modules can use this standard state when a request fails or permissions change."),
      })}
    </section>
  `;
}

function renderAdmin() {
  return `
    ${pageHeader({
      kicker: "Admin control",
      title: "Administration",
      description:
        "Admin-only route visibility is active. Future settings, user controls, and policy management can mount here.",
      actions: `<a class="button button-primary" href="#/audit">View audit log</a>`,
    })}
    <section class="grid grid-3">
      ${card({
        title: "Role policy",
        badge: statusChip("Admin", "warning"),
        body: `<p class="card-description">Admin-only routes are excluded from employee navigation and blocked on direct access.</p>`,
      })}
      ${card({
        title: "Access model",
        badge: statusChip("Prepared", "success"),
        body: `<p class="card-description">The route registry centralizes allowed roles for clear review and future server alignment.</p>`,
      })}
      ${card({
        title: "Admin actions",
        badge: statusChip("Empty", "warning"),
        body: `<p class="card-description">No administrative business settings are included until a later module requires them.</p>`,
      })}
    </section>
  `;
}

function renderAudit() {
  const events = listAuditEvents();
  const rows = events
    .slice(0, 12)
    .map((event) => [
      escapeHtml(event.action),
      statusChip(event.role, event.role === "admin" ? "warning" : "success"),
      escapeHtml(event.actor),
      escapeHtml(formatDate(event.createdAt)),
    ]);

  return `
    ${pageHeader({
      kicker: "Audit plumbing",
      title: "Audit Log",
      description:
        "Client-side audit events show the foundation contract for actor, role, action, timestamp, and metadata.",
      actions: `<button class="button button-secondary" type="button" data-action="clear-audit">Clear local events</button>`,
    })}
    ${tableShell({
      columns: ["Action", "Role", "Actor", "Timestamp"],
      rows,
      emptyTitle: "No audit events recorded",
      emptyCopy: "Sign-in, sign-out, route, and access events will appear here for local shell verification.",
    })}
  `;
}

function renderRouteState(activeRoute) {
  if (activeRoute.status === "forbidden") {
    recordAuditEvent("route.access_denied", { path: activeRoute.path });
    return `
      ${pageHeader({
        kicker: "Access control",
        title: "Route unavailable",
        description: "Your current role does not include access to this route.",
      })}
      ${errorState("Permission required", "Switch to an authorized role or ask an administrator to review access.")}
    `;
  }

  return `
    ${pageHeader({
      kicker: "Route structure",
      title: "Page not found",
      description: "The requested route is not registered in the application shell.",
    })}
    ${emptyState({
      icon: "404",
      title: "No route registered",
      copy: "Use the primary navigation to return to a protected shell route.",
    })}
  `;
}

function pageHeader({ kicker, title, description, actions = "" }) {
  return `
    <header class="page-header">
      <div>
        <p class="page-kicker">${escapeHtml(kicker)}</p>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="page-description">${escapeHtml(description)}</p>
      </div>
      <div>${actions}</div>
    </header>
  `;
}

function brandMark() {
  return `
    <div class="brand-mark" aria-label="True Crew">
      <div class="brand-icon" aria-hidden="true">TC</div>
      <div>
        <p class="brand-name">True Crew</p>
        <p class="brand-caption">Operations platform</p>
      </div>
    </div>
  `;
}

function metricCard(title, value, description) {
  return card({
    title,
    body: `
      <p class="metric-value">${escapeHtml(value)}</p>
      <p class="metric-label">${escapeHtml(description)}</p>
    `,
  });
}

function card({ title, body, badge = "" }) {
  return `
    <article class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">${escapeHtml(title)}</h2>
        </div>
        ${badge}
      </div>
      ${body}
    </article>
  `;
}

function filtersToolbar() {
  return `
    <section class="toolbar" aria-label="Filters toolbar">
      <div class="toolbar-group">
        <label class="sr-only" for="filter-status">Status</label>
        <select id="filter-status" class="select" aria-label="Filter by status">
          <option>All statuses</option>
          <option>Open</option>
          <option>In review</option>
          <option>Closed</option>
        </select>
        <label class="sr-only" for="filter-owner">Owner</label>
        <input id="filter-owner" class="input" type="search" placeholder="Filter owner" autocomplete="off" />
      </div>
      <div class="toolbar-group">
        ${statusChip("Standard filters", "success")}
      </div>
    </section>
  `;
}

function tableShell({ columns, rows, emptyTitle, emptyCopy }) {
  if (!rows.length) {
    return emptyState({
      icon: "0",
      title: emptyTitle,
      copy: emptyCopy,
    });
  }

  return `
    <div class="table-shell" role="region" aria-label="Records table" tabindex="0">
      <table class="table">
        <thead>
          <tr>${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function emptyState({ icon, title, copy }) {
  return `
    <section class="state-panel" aria-label="${escapeHtml(title)}">
      <div>
        <div class="state-icon" aria-hidden="true">${escapeHtml(icon)}</div>
        <h2 class="state-title">${escapeHtml(title)}</h2>
        <p class="state-copy">${escapeHtml(copy)}</p>
      </div>
    </section>
  `;
}

function loadingState(copy) {
  return `
    <section class="state-panel" aria-label="Loading">
      <div>
        <div class="state-icon" aria-hidden="true">...</div>
        <h2 class="state-title">Loading</h2>
        <p class="state-copy">${escapeHtml(copy)}</p>
        <div class="loading-bar" aria-hidden="true"></div>
      </div>
    </section>
  `;
}

function errorState(title, copy) {
  return `
    <section class="state-panel" role="alert" aria-label="${escapeHtml(title)}">
      <div>
        <div class="state-icon" aria-hidden="true">!</div>
        <h2 class="state-title">${escapeHtml(title)}</h2>
        <p class="state-copy">${escapeHtml(copy)}</p>
      </div>
    </section>
  `;
}

function statusRow(title, copy) {
  return `
    <div>
      <h3 class="card-title">${escapeHtml(title)}</h3>
      <p class="card-description">${escapeHtml(copy)}</p>
    </div>
  `;
}

function statusChip(label, tone = "success") {
  const safeTone = ["success", "warning", "danger"].includes(tone) ? tone : "success";
  return `<span class="status-chip status-${safeTone}">${escapeHtml(label)}</span>`;
}

function bindShellEvents() {
  document.getElementById("sign-out").addEventListener("click", handleSignOut);
  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    appState.sidebarOpen = !appState.sidebarOpen;
    renderApp();
  });
  document.getElementById("global-search").addEventListener("submit", handleSearch);
  document.getElementById("toast-check").addEventListener("click", () => {
    showToast("Notifications ready", "Toast base is available for future workflow events.");
  });

  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast("Foundation action", button.dataset.toast));
  });

  document.querySelector("[data-action='clear-audit']")?.addEventListener("click", () => {
    sessionStorage.removeItem(AUDIT_KEY);
    recordAuditEvent("audit.cleared");
    showToast("Audit log cleared", "Local audit entries were reset for this session.");
    renderApp();
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      appState.sidebarOpen = false;
    });
  });
}

function handleSignIn(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = sanitizeText(formData.get("displayName"), 80);
  const role = sanitizeText(formData.get("role"), 24);

  if (!validateRequired(name, 2) || !roles[role]) {
    showToast("Access incomplete", "Enter a name and choose a valid role.");
    return;
  }

  appState.user = {
    id: createId(),
    name,
    role,
    csrfToken: createId(),
    authenticatedAt: new Date().toISOString(),
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(appState.user));
  recordAuditEvent("auth.signed_in");
  showToast("Protected shell opened", `${roles[role].label} navigation is active.`);
  window.location.hash = "#/";
  renderApp();
}

function handleSignOut() {
  recordAuditEvent("auth.signed_out");
  sessionStorage.removeItem(SESSION_KEY);
  appState.user = null;
  appState.sidebarOpen = false;
  showToast("Signed out", "The protected shell is closed.");
  renderApp();
}

function handleSearch(event) {
  event.preventDefault();
  const input = document.getElementById("search-input");
  const query = sanitizeText(input.value, 120);

  if (query.length && query.length < SEARCH_MIN_LENGTH) {
    showToast("Search needs more detail", "Enter at least two characters.");
    return;
  }

  recordAuditEvent("search.placeholder_used", { queryLength: query.length });
  showToast("Search shell ready", "Global search will connect when module data is available.");
  input.value = "";
}

function getActiveRoute() {
  const path = normalizePath(window.location.hash.replace(/^#/, "") || "/");
  const route = routes.find((item) => item.path === path);

  if (!route) {
    return { status: "missing", path, route: getVisibleRoutes()[0] };
  }

  if (!hasRole(route.roles)) {
    return { status: "forbidden", path, route };
  }

  recordAuditEvent("route.viewed", { path });
  return { status: "ok", path, route };
}

function getVisibleRoutes() {
  return routes.filter((route) => hasRole(route.roles));
}

function hasRole(allowedRoles) {
  return Boolean(appState.user && allowedRoles.includes(appState.user.role));
}

function normalizePath(path) {
  if (!path || path === "#") {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function readSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return value && roles[value.role] && value.name ? value : null;
  } catch {
    return null;
  }
}

function recordAuditEvent(action, metadata = {}) {
  if (!appState.user) {
    return;
  }

  const events = listAuditEvents();
  events.unshift({
    id: createId(),
    action,
    actor: appState.user.name,
    actorId: appState.user.id,
    role: appState.user.role,
    metadata,
    createdAt: new Date().toISOString(),
  });

  sessionStorage.setItem(AUDIT_KEY, JSON.stringify(events.slice(0, 100)));
}

function listAuditEvents() {
  try {
    return JSON.parse(sessionStorage.getItem(AUDIT_KEY)) || [];
  } catch {
    return [];
  }
}

async function secureFetch(url, options = {}) {
  const requestUrl = new URL(url, window.location.origin);

  if (requestUrl.origin !== window.location.origin) {
    throw new Error("Cross-origin requests must be explicitly reviewed.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (appState.user?.csrfToken) {
    headers.set("X-CSRF-Token", appState.user.csrfToken);
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers,
    credentials: "same-origin",
    referrerPolicy: "same-origin",
  });

  if (!response.ok) {
    recordAuditEvent("api.request_failed", {
      status: response.status,
      path: requestUrl.pathname,
    });
    throw new Error("Request failed.");
  }

  recordAuditEvent("api.request_completed", { path: requestUrl.pathname });
  return response;
}

function sanitizeText(value, maxLength = 160) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function validateRequired(value, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getInitials(name) {
  return sanitizeText(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `tc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function showToast(title, message) {
  const region = document.getElementById("toast-region");
  const toast = document.createElement("section");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message || "")}</p>`;
  region.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}

function getApp() {
  return document.getElementById("app");
}
