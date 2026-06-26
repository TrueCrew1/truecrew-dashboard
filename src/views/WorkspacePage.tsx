"use client";

import { useState } from "react";
import {
  DataTableShell,
  FiltersToolbar,
  PageButton,
  PageHeader,
  PageShell,
} from "@/components/ui";

export function WorkspacePage() {
  const [notice, setNotice] = useState<string | null>(null);

  function handleNewRecord() {
    setNotice("Work creation belongs to the next requested module.");
    window.setTimeout(() => setNotice(null), 4000);
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Employee workspace"
        title="Assigned Work"
        description="A controlled surface for work queues, task details, and field execution records when operational modules are added."
        actions={
          <PageButton variant="secondary" onClick={handleNewRecord}>
            New record
          </PageButton>
        }
      />

      {notice ? (
        <p className="page-notice" role="status">
          {notice}
        </p>
      ) : null}

      <FiltersToolbar searchPlaceholder="Search assigned work…" />

      <section className="panel">
        <DataTableShell
          columns={["Record", "Status", "Owner", "Updated"]}
          rows={[]}
          emptyTitle="No assigned work records"
          emptyCopy="This foundation does not ship production sample work orders. Module data can attach here through the shared table pattern."
        />
      </section>
    </PageShell>
  );
}
