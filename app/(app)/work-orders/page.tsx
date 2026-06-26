import { WorkOrdersListView } from "@/components/operational/WorkOrdersListView";
import { fetchWorkOrders } from "@/lib/supabase/queries";

export default async function WorkOrdersPage() {
  let orders: Awaited<ReturnType<typeof fetchWorkOrders>> = [];

  try {
    orders = await fetchWorkOrders();
  } catch {
    // Supabase not configured or migration pending.
  }

  return <WorkOrdersListView initialOrders={orders} />;
}
