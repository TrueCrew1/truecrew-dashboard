import {
  EmptyState,
  FiltersToolbar,
  PageButton,
  PageHeader,
  PageShell,
  Panel,
  StatGrid,
  StatusBadge,
  StatusRow,
} from "@/components/ui";

export function CommandCenterPage({ roleLabel = "Employee" }: { roleLabel?: string }) {
  return (
    <PageShell>
      <PageHeader
        kicker="Application foundation"
        title="Command Center"
        description="A protected operational shell with Supabase auth, Postgres records, and reusable page patterns."
        actions={<PageButton href="/workspace" variant="primary">Open workspace</PageButton>}
      />

      <StatGrid
        stats={[
          {
            label: "Protected shell",
            value: "Active",
            meta: "Supabase session auth gates all routes.",
          },
          {
            label: "Role controls",
            value: roleLabel,
            meta: "Navigation reflects the signed-in profile role.",
          },
          {
            label: "Database",
            value: "Supabase",
            meta: "Tasks, workflows, incidents, tools, and customers.",
          },
        ]}
      />

      <div className="grid-2">
        <Panel title="Reusable page patterns" badge={<StatusBadge status="Configured" variant="green" />}>
          <FiltersToolbar />
          <EmptyState
            title="No operational records yet"
            copy="Later modules can mount tables, forms, filters, and status chips here without changing the shell."
          />
        </Panel>

        <Panel title="Security defaults" badge={<StatusBadge status="On" variant="green" />}>
          <div className="panel-stack">
            <StatusRow
              label="Form handling"
              copy="Required fields, length limits, text sanitization, and autocomplete controls are in place."
            />
            <StatusRow
              label="API handling"
              copy="Same-origin request helper defaults to JSON headers and credentialed requests."
            />
            <StatusRow
              label="Auditability"
              copy="Route and access events can be recorded with actor, role, timestamp, and metadata."
            />
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
