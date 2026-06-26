import {
  DataTableShell,
  PageButton,
  PageHeader,
  PageShell,
  StatusBadge,
} from "@/components/ui";
import { fetchAuthAuditEvents } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

function formatAuditDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export async function AuditPageNext() {
  let events: Awaited<ReturnType<typeof fetchAuthAuditEvents>> = [];

  try {
    events = await fetchAuthAuditEvents();
  } catch {
    events = [];
  }

  async function clearAudit() {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("auth_audit_events").delete().eq("user_id", user.id);
    await supabase.from("auth_audit_events").insert({
      user_id: user.id,
      action: "audit.cleared",
      actor_email: user.email,
    } as Database["public"]["Tables"]["auth_audit_events"]["Insert"]);
  }

  const rows = events.map((event) => [
    event.action,
    <StatusBadge
      key={`role-${event.id}`}
      status={event.role ?? "employee"}
      variant={event.role === "admin" ? "orange" : "green"}
    />,
    event.actor_email ?? "—",
    formatAuditDate(event.created_at),
  ]);

  return (
    <PageShell>
      <PageHeader
        kicker="Audit plumbing"
        title="Audit Log"
        description="Auth and route events persisted in Supabase for actor, role, action, and timestamp."
        actions={
          <form action={clearAudit}>
            <PageButton variant="secondary" type="submit">
              Clear my events
            </PageButton>
          </form>
        }
      />

      <section className="panel">
        <DataTableShell
          columns={["Action", "Role", "Actor", "Timestamp"]}
          rows={rows}
          emptyTitle="No audit events recorded"
          emptyCopy="Sign-in, sign-out, and route events will appear here after activity."
        />
      </section>
    </PageShell>
  );
}
