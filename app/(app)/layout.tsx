import { AppShell } from "@/components/layout/AppShellNext";
import { fetchProfile } from "@/lib/supabase/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await fetchProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
