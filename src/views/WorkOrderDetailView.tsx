import Link from "next/link";
import {
  DetailLayout,
  DetailLinkList,
  DetailPanel,
} from "@/components/operational/DetailLayout";
import { StatusBadge, StatusRow } from "@/components/ui";
import {
  formatOperationalDate,
  formatOperationalDateShort,
  PRIORITY_VARIANT,
  SLA_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANT,
} from "@/lib/operational";
import type { WorkOrderRow } from "@/types/database";

export function WorkOrderDetailView({ order }: { order: WorkOrderRow }) {
  const isOverdue =
    order.due_at &&
    !["completed", "cancelled"].includes(order.status) &&
    new Date(order.due_at) < new Date();

  return (
    <DetailLayout
      kicker="Work order"
      title={order.title}
      description={order.description || undefined}
      backHref="/work-orders"
      backLabel="Work orders"
      badges={
        <>
          <StatusBadge
            status={WORK_ORDER_STATUS_LABELS[order.status] ?? order.status}
            variant={WORK_ORDER_STATUS_VARIANT[order.status] ?? "steel"}
          />
          <StatusBadge
            status={order.priority}
            variant={PRIORITY_VARIANT[order.priority] ?? "steel"}
          />
        </>
      }
      stats={[
        { label: "Status", value: WORK_ORDER_STATUS_LABELS[order.status] ?? order.status },
        { label: "SLA tier", value: SLA_LABELS[order.sla_tier] ?? order.sla_tier },
        {
          label: "Due",
          value: formatOperationalDateShort(order.due_at),
          meta: isOverdue ? "Overdue" : undefined,
        },
        { label: "Assignee", value: order.assignee ?? "Unassigned" },
      ]}
      main={
        <>
          <DetailPanel title="Details">
            <div className="panel-stack">
              <StatusRow label="Site" copy={order.site_name ?? "—"} />
              <StatusRow
                label="Crew"
                copy={
                  order.crews ? (
                    <Link href={`/crews/${order.crews.id}`} className="ops-inline-link">
                      {order.crews.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <StatusRow
                label="Asset"
                copy={
                  order.assets ? (
                    <Link href={`/assets/${order.assets.id}`} className="ops-inline-link">
                      {order.assets.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <StatusRow label="Created by" copy={order.created_by} />
              <StatusRow label="Updated" copy={formatOperationalDate(order.updated_at)} />
              {order.completed_at ? (
                <StatusRow label="Completed" copy={formatOperationalDate(order.completed_at)} />
              ) : null}
            </div>
          </DetailPanel>

          {order.blocker ? (
            <DetailPanel
              title="Blocker"
              badge={<StatusBadge status="Blocked" variant="red" />}
            >
              <p className="ops-detail-note">{order.blocker}</p>
            </DetailPanel>
          ) : null}

          {order.description ? (
            <DetailPanel title="Description">
              <p className="ops-detail-note">{order.description}</p>
            </DetailPanel>
          ) : null}
        </>
      }
      sidebar={
        <>
          <DetailPanel title="Identifiers">
            <div className="panel-stack">
              <StatusRow label="Record ID" copy={order.legacy_id ?? order.id.slice(0, 8)} />
              <StatusRow label="Priority" copy={order.priority} />
              <StatusRow
                label="SLA"
                copy={SLA_LABELS[order.sla_tier] ?? order.sla_tier}
              />
            </div>
          </DetailPanel>

          <DetailPanel title="Related">
            <DetailLinkList
              items={[
                ...(order.crews
                  ? [
                      {
                        href: `/crews/${order.crews.id}`,
                        title: order.crews.name,
                        meta: "Assigned crew",
                      },
                    ]
                  : []),
                ...(order.assets
                  ? [
                      {
                        href: `/assets/${order.assets.id}`,
                        title: order.assets.name,
                        meta: "Linked asset",
                      },
                    ]
                  : []),
              ]}
            />
          </DetailPanel>
        </>
      }
    />
  );
}
