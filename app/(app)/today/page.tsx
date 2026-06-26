import { TodayView } from "@/components/today/TodayView";
import { fetchActiveIncidents, fetchTodayTasks } from "@/lib/supabase/queries";

export default async function TodayPage() {
  let tasks: Awaited<ReturnType<typeof fetchTodayTasks>> = [];
  let incidents: Awaited<ReturnType<typeof fetchActiveIncidents>> = [];

  try {
    [tasks, incidents] = await Promise.all([fetchTodayTasks(), fetchActiveIncidents()]);
  } catch {
    // Supabase not configured or RLS/migration pending — render empty shell.
  }

  return <TodayView initialTasks={tasks} initialIncidents={incidents} />;
}
