import { TodayView } from "@/components/today/TodayView";
import { fetchTodayTasks } from "@/lib/supabase/queries";

export default async function TodayPage() {
  let tasks: Awaited<ReturnType<typeof fetchTodayTasks>> = [];

  try {
    tasks = await fetchTodayTasks();
  } catch {
    // Supabase not configured or RLS/migration pending — render empty shell.
  }

  return <TodayView initialTasks={tasks} />;
}
