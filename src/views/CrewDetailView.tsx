import {
  DetailLayout,
  DetailLinkList,
  DetailPanel,
} from "@/components/operational/DetailLayout";
import { StatusBadge, StatusRow } from "@/components/ui";
import {
  CREW_AVAILABILITY_LABELS,
  CREW_AVAILABILITY_VARIANT,
  formatOperationalDate,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANT,
} from "@/lib/operational";
import type { CrewRow } from "@/types/database";

interface CrewDetailViewProps {
  crew: CrewRow;
  workOrders: {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_at: string | null;
  }[];
  assets: {
    id: string;
    name: string;
    asset_type: string;
    status: string;
  }[];
}

export function CrewDetailView({ crew, workOrders, assets }: CrewDetailViewProps) {
  const capacityPct = Math.min(100, Math.round((workOrders.length / crew.capacity) * 100));

  return (
    <DetailLayout
      kicker="Crew"
      title={crew.name}
      description={crew.notes || undefined}
      backHref="/crews"
      backLabel="Crews"
      badges={
        <StatusBadge
          status={CREW_AVAILABILITY_LABELS[crew.availability] ?? crew.availability}
          variant={CREW_AVAILABILITY_VARIANT[crew.availability] ?? "steel"}
        />
      }
      stats={[
        { label: "Capacity", value: crew.capacity, meta: "Max concurrent work" },
        {
          label: "Active WOs",
          value: workOrders.length,
          meta: `${capacityPct}% utilized`,
        },
        { label: "Site", value: crew.site_name ?? "—" },
        { label: "Lead", value: crew.lead_name ?? "—" },
      ]}
      main={
        <>
          <DetailPanel title="Crew profile">
            <div className="panel-stack">
              <StatusRow label="Slug" copy={crew.slug} />
              <StatusRow label="Site" copy={crew.site_name ?? "—"} />
              <StatusRow label="Lead" copy={crew.lead_name ?? "—"} />
              <StatusRow
                label="Availability"
                copy={CREW_AVAILABILITY_LABELS[crew.availability] ?? crew.availability}
              />
              <StatusRow label="Active" copy={crew.active ? "Yes" : "No"} />
              <StatusRow label="Updated" copy={formatOperationalDate(crew.updated_at)} />
            </div>
          </DetailPanel>

          <DetailPanel title="Capacity gauge">
            <div className="ops-capacity-gauge">
              <div className="ops-capacity-bar" aria-hidden="true">
                <div
                  className="ops-capacity-fill"
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
              <p className="ops-capacity-label">
                {workOrders.length} active work orders · {crew.capacity} capacity
              </p>
            </div>
          </DetailPanel>

          {crew.notes ? (
            <DetailPanel title="Notes">
              <p className="ops-detail-note">{crew.notes}</p>
            </DetailPanel>
          ) : null}
        </>
      }
      sidebar={
        <>
          <DetailPanel title="Active work orders" badge={<span className="today-zone-count">{workOrders.length}</span>}>
            <DetailLinkList
              items={workOrders.map((wo) => ({
                href: `/work-orders/${wo.id}`,
                title: wo.title,
                meta: wo.due_at ? formatOperationalDate(wo.due_at) : undefined,
                badge: (
                  <StatusBadge
                    status={WORK_ORDER_STATUS_LABELS[wo.status] ?? wo.status}
                    variant={WORK_ORDER_STATUS_VARIANT[wo.status] ?? "steel"}
                  />
                ),
              }))}
            />
          </DetailPanel>

          <DetailPanel title="Assigned assets" badge={<span className="today-zone-count">{assets.length}</span>}>
            <DetailLinkList
              items={assets.map((asset) => ({
                href: `/assets/${asset.id}`,
                title: asset.name,
                meta: asset.asset_type,
                badge: (
                  <StatusBadge status={asset.status} variant="steel" />
                ),
              }))}
            />
          </DetailPanel>
        </>
      }
    />
  );
}
