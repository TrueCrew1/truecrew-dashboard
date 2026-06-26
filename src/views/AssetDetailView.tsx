import Link from "next/link";
import {
  DetailLayout,
  DetailLinkList,
  DetailPanel,
} from "@/components/operational/DetailLayout";
import { StatusBadge, StatusRow } from "@/components/ui";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_VARIANT,
  ASSET_TYPE_LABELS,
  formatOperationalDate,
  formatOperationalDateShort,
} from "@/lib/operational";
import type { AssetRow } from "@/types/database";

export function AssetDetailView({ asset }: { asset: AssetRow }) {
  return (
    <DetailLayout
      kicker="Asset"
      title={asset.name}
      description={asset.notes || undefined}
      backHref="/assets"
      backLabel="Assets"
      badges={
        <>
          <StatusBadge
            status={ASSET_STATUS_LABELS[asset.status] ?? asset.status}
            variant={ASSET_STATUS_VARIANT[asset.status] ?? "steel"}
          />
          <StatusBadge
            status={ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
            variant="steel"
          />
        </>
      }
      stats={[
        { label: "Type", value: ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type },
        { label: "Site", value: asset.site_name ?? "—" },
        { label: "Last service", value: formatOperationalDateShort(asset.last_service_at) },
        { label: "Next service", value: formatOperationalDateShort(asset.next_service_at) },
      ]}
      main={
        <>
          <DetailPanel title="Equipment details">
            <div className="panel-stack">
              <StatusRow label="Serial number" copy={asset.serial_number ?? "—"} />
              <StatusRow label="Manufacturer" copy={asset.manufacturer ?? "—"} />
              <StatusRow label="Model" copy={asset.model ?? "—"} />
              <StatusRow
                label="Assigned crew"
                copy={
                  asset.crews ? (
                    <Link href={`/crews/${asset.crews.id}`} className="ops-inline-link">
                      {asset.crews.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <StatusRow label="Updated" copy={formatOperationalDate(asset.updated_at)} />
            </div>
          </DetailPanel>

          {asset.notes ? (
            <DetailPanel title="Notes">
              <p className="ops-detail-note">{asset.notes}</p>
            </DetailPanel>
          ) : null}
        </>
      }
      sidebar={
        <>
          <DetailPanel title="Identifiers">
            <div className="panel-stack">
              <StatusRow label="Asset ID" copy={asset.legacy_id ?? asset.id.slice(0, 8)} />
              <StatusRow
                label="Status"
                copy={ASSET_STATUS_LABELS[asset.status] ?? asset.status}
              />
            </div>
          </DetailPanel>

          {asset.crews ? (
            <DetailPanel title="Related">
              <DetailLinkList
                items={[
                  {
                    href: `/crews/${asset.crews.id}`,
                    title: asset.crews.name,
                    meta: "Assigned crew",
                  },
                ]}
              />
            </DetailPanel>
          ) : null}
        </>
      }
    />
  );
}
