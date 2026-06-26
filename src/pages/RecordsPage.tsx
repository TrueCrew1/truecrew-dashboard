import {
  ErrorState,
  LoadingState,
  PageButton,
  PageHeader,
  PageShell,
  Panel,
} from "@/components/ui";

export function RecordsPage() {
  return (
    <PageShell>
      <PageHeader
        kicker="Structured records"
        title="Records"
        description="A standard place for module-owned records with consistent filters, statuses, empty states, and error handling."
        actions={
          <PageButton
            variant="secondary"
            onClick={() => {
              /* reserved for module import */
            }}
          >
            Import
          </PageButton>
        }
      />

      <div className="grid-2">
        <Panel title="Loading state">
          <LoadingState copy="Records will show a deterministic loading pattern while module data is requested." />
        </Panel>

        <Panel title="Error state">
          <ErrorState
            title="Record source unavailable"
            copy="Modules can use this standard state when a request fails or permissions change."
          />
        </Panel>
      </div>
    </PageShell>
  );
}
