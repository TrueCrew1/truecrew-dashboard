const AUDIT_KEY = "truecrew.audit";

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  actorId: string;
  role: "admin" | "employee";
  metadata: Record<string, unknown>;
  createdAt: string;
}

const DEFAULT_ACTOR = {
  id: "founder-1",
  name: "Founder",
  role: "admin" as const,
};

function createId() {
  return crypto.randomUUID();
}

export function listAuditEvents(): AuditEvent[] {
  try {
    return JSON.parse(sessionStorage.getItem(AUDIT_KEY) || "[]") as AuditEvent[];
  } catch {
    return [];
  }
}

export function recordAuditEvent(
  action: string,
  metadata: Record<string, unknown> = {},
  actor = DEFAULT_ACTOR,
) {
  const events = listAuditEvents();
  events.unshift({
    id: createId(),
    action,
    actor: actor.name,
    actorId: actor.id,
    role: actor.role,
    metadata,
    createdAt: new Date().toISOString(),
  });
  sessionStorage.setItem(AUDIT_KEY, JSON.stringify(events.slice(0, 100)));
}

export function clearAuditEvents() {
  sessionStorage.removeItem(AUDIT_KEY);
}

export function formatAuditDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
