import {
  PageButton,
  PageHeader,
  PageShell,
  Panel,
  StatusBadge,
} from "@/components/ui";

export function AdminPage() {
  return (
    <PageShell>
      <PageHeader
        kicker="Admin control"
        title="Administration"
        description="Admin-only route visibility is active. Future settings, user controls, and policy management can mount here."
        actions={<PageButton to="/audit" variant="primary">View audit log</PageButton>}
      />

      <div className="grid-3">
        <Panel title="Role policy" badge={<StatusBadge status="Admin" variant="orange" />}>
          <p className="page-description-block">
            Admin-only routes are excluded from employee navigation and blocked on direct access.
          </p>
        </Panel>

        <Panel title="Access model" badge={<StatusBadge status="Prepared" variant="green" />}>
          <p className="page-description-block">
            The route registry centralizes allowed roles for clear review and future server alignment.
          </p>
        </Panel>

        <Panel title="Admin actions" badge={<StatusBadge status="Empty" variant="orange" />}>
          <p className="page-description-block">
            No administrative business settings are included until a later module requires them.
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
