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

export function CommandCenterPage() {
  return (
    <PageShell>
      <PageHeader
        kicker="Application foundation"
        title="Command Center"
        description="A protected operational shell with reusable patterns ready for maintenance, field-service, and administrative modules."
        actions={<PageButton to="/workspace" variant="primary">Open workspace</PageButton>}
      />

      <StatGrid
        stats={[
          {
            label: "Protected shell",
            value: "Active",
            meta: "Session-gated routing is enabled.",
          },
          {
            label: "Role controls",
            value: "Admin",
            meta: "Navigation reflects the active role.",
          },
          {
            label: "Audit hooks",
            value: "Ready",
            meta: "Client-side audit plumbing is available for future modules.",
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
