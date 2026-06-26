import { AssetsListView } from "@/components/operational/AssetsListView";
import { fetchAssets } from "@/lib/supabase/queries";

export default async function AssetsPage() {
  let assets: Awaited<ReturnType<typeof fetchAssets>> = [];

  try {
    assets = await fetchAssets();
  } catch {
    // Supabase not configured or migration pending.
  }

  return <AssetsListView initialAssets={assets} />;
}
