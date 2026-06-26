import { useMemo } from "react";
import { PageHeader } from "@/components/ui";
import { useSelection } from "@/context/SelectionContext";
import { useTodayTasks } from "@/hooks/useTodayTasks";
import {
  applyTodayFilters,
  computeCrewCapacity,
  selectBlockers,
  selectInProgress,
  selectMit,
  selectOverdue,
  selectPriorityQueue,
} from "@/lib/today/selectors";
import { computeNextAction } from "@/lib/today/nextAction";
import { TodayFiltersBar } from "@/components/today/TodayFiltersBar";
import { MitCard } from "@/components/today/MitCard";
import { InProgressPanel } from "@/components/today/InProgressPanel";
import { TaskListPanel } from "@/components/today/TaskListPanel";
import { QuickCapture } from "@/components/today/QuickCapture";
import { NextActionCard } from "@/components/today/NextActionCard";

export function TodayPage() {
  const { setSelectedEntityId } = useSelection();
  const { tasks, loading, error, source, filters, setFilters, createTask, refresh } =
    useTodayTasks();

  const filtered = useMemo(
    () => applyTodayFilters(tasks, filters),
    [tasks, filters],
  );

  const mit = useMemo(() => selectMit(filtered), [filtered]);
  const inProgress = useMemo(() => selectInProgress(filtered), [filtered]);
  const priorityQueue = useMemo(() => selectPriorityQueue(filtered), [filtered]);
  const overdue = useMemo(() => selectOverdue(filtered), [filtered]);
  const blockers = useMemo(() => selectBlockers(filtered), [filtered]);
  const crewCapacity = useMemo(() => computeCrewCapacity(filtered), [filtered]);
  const nextAction = useMemo(() => computeNextAction(filtered), [filtered]);

  const handleSelect = (taskId: string) => setSelectedEntityId(taskId);

  const handleCreate = async (input: Parameters<typeof createTask>[0]) => {
    await createTask(input);
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Today"
        accent="Workspace"
        subtitle="Operational command surface — MIT, crew capacity, SLA queues, and blockers"
      />

      <TodayFiltersBar
        filters={filters}
        onChange={setFilters}
        taskCount={filtered.length}
        source={source}
      />

      {loading ? (
        <div className="today-loading">Loading tasks…</div>
      ) : null}

      {error ? (
        <div className="today-error">
          {error} — showing fallback data
        </div>
      ) : null}

      <div className="today-hero">
        <MitCard task={mit} onSelect={handleSelect} />
        <NextActionCard action={nextAction} onSelect={handleSelect} />
      </div>

      <div className="today-grid">
        <InProgressPanel
          tasks={inProgress}
          capacity={crewCapacity}
          onSelect={handleSelect}
        />
        <TaskListPanel
          title="Priority Queue"
          tasks={priorityQueue}
          onSelect={handleSelect}
          emptyMessage="Queue clear — no pending items"
        />
      </div>

      <div className="today-grid">
        <TaskListPanel
          title="Overdue"
          tasks={overdue}
          onSelect={handleSelect}
          emptyMessage="No overdue tasks"
          highlightOverdue
        />
        <TaskListPanel
          title="Blockers / Waiting"
          tasks={blockers}
          onSelect={handleSelect}
          emptyMessage="No blockers or waiting items"
          showBlocker
        />
      </div>

      <QuickCapture onCreate={handleCreate} />
    </>
  );
}
