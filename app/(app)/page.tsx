import { CommandCenterPage } from "@/views/CommandCenterPage";
import { fetchProfile } from "@/lib/supabase/queries";

export default async function CommandCenterRoute() {
  const profile = await fetchProfile();

  return (
    <CommandCenterPage
      roleLabel={profile?.role === "admin" ? "Admin" : "Employee"}
    />
  );
}
