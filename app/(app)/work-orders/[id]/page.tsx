import { notFound } from "next/navigation";
import { WorkOrderDetailView } from "@/views/WorkOrderDetailView";
import { fetchWorkOrderById } from "@/lib/supabase/queries";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const order = await fetchWorkOrderById(id);
    return <WorkOrderDetailView order={order} />;
  } catch {
    notFound();
  }
}
