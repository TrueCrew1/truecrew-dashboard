import { CrewsListView } from "@/components/operational/CrewsListView";
import { fetchCrews } from "@/lib/supabase/queries";

export default async function CrewsPage() {
  let crews: Awaited<ReturnType<typeof fetchCrews>> = [];

  try {
    crews = await fetchCrews();
  } catch {
    // Supabase not configured or migration pending.
  }

  return <CrewsListView initialCrews={crews} />;
}
