import { useEffect, useState } from "react";
import {
  DataTableShell,
  PageButton,
  PageHeader,
  PageShell,
  StatusBadge,
} from "@/components/ui";
import {
  clearAuditEvents,
  formatAuditDate,
  listAuditEvents,
  recordAuditEvent,
  type AuditEvent,
} from "@/lib/audit";

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    const existing = listAuditEvents();
    if (existing.length === 0) {
      recordAuditEvent("auth.signed_in");
      recordAuditEvent("route.viewed", { path: "/audit" });
    } else {
      recordAuditEvent("route.viewed", { path: "/audit" });
    }
    setEvents(listAuditEvents());
  }, []);

  function handleClear() {
    clearAuditEvents();
    recordAuditEvent("audit.cleared");
    setEvents(listAuditEvents());
  }

  const rows = events.slice(0, 12).map((event) => [
    event.action,
    <StatusBadge
      key={`role-${event.id}`}
      status={event.role}
      variant={event.role === "admin" ? "orange" : "green"}
    />,
    event.actor,
    formatAuditDate(event.createdAt),
  ]);

  return (
    <PageShell>
      <PageHeader
        kicker="Audit plumbing"
        title="Audit Log"
        description="Client-side audit events show the foundation contract for actor, role, action, timestamp, and metadata."
        actions={
          <PageButton variant="secondary" onClick={handleClear}>
            Clear local events
          </PageButton>
        }
      />

      <section className="panel">
        <DataTableShell
          columns={["Action", "Role", "Actor", "Timestamp"]}
          rows={rows}
          emptyTitle="No audit events recorded"
          emptyCopy="Sign-in, sign-out, route, and access events will appear here for local shell verification."
        />
      </section>
    </PageShell>
  );
}
