import { notFound } from "next/navigation";
import { CrewDetailView } from "@/views/CrewDetailView";
import {
  fetchAssetsByCrewId,
  fetchCrewById,
  fetchWorkOrdersByCrewId,
} from "@/lib/supabase/queries";

export default async function CrewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [crew, workOrders, assets] = await Promise.all([
      fetchCrewById(id),
      fetchWorkOrdersByCrewId(id),
      fetchAssetsByCrewId(id),
    ]);

    return <CrewDetailView crew={crew} workOrders={workOrders} assets={assets} />;
  } catch {
    notFound();
  }
}
