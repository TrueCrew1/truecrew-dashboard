import { notFound } from "next/navigation";
import { AssetDetailView } from "@/views/AssetDetailView";
import { fetchAssetById } from "@/lib/supabase/queries";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const asset = await fetchAssetById(id);
    return <AssetDetailView asset={asset} />;
  } catch {
    notFound();
  }
}
