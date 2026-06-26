"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { ProfileRow } from "@/types/database";

export function FoundationTopBar({ profile }: { profile: ProfileRow | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("auth_audit_events").insert({
        user_id: user.id,
        action: "auth.signed_out",
        role: profile?.role ?? "employee",
        actor_email: user.email,
      } as Database["public"]["Tables"]["auth_audit_events"]["Insert"]);
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-icon" aria-hidden="true">
          /
        </span>
        <input
          type="search"
          placeholder="Search tasks, records…"
          aria-label="Global search"
        />
        <span className="topbar-search-kbd" aria-hidden="true">
          /
        </span>
      </div>

      <div className="topbar-actions">
        <ThemeToggle />
        <span className="topbar-role">{profile?.role === "admin" ? "Admin" : "Employee"}</span>
        <div className="topbar-avatar" title={profile?.full_name ?? profile?.email ?? "User"}>
          {(profile?.full_name ?? profile?.email ?? "U").charAt(0).toUpperCase()}
        </div>
        <button type="button" className="topbar-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
