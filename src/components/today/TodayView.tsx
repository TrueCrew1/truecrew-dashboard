"use client";

import { useMemo, useState } from "react";
import {
  applyTodayFilters,
  CREW_CAPACITY,
  deriveFilterOptions,
  deriveNextAction,
  partitionTodayZones,
  type TodayFilters,
  type TodayTask,
} from "@/lib/today";
import { TodayFiltersBar } from "./TodayFiltersBar";
import { TodayBanner, TodayCapacityAlert } from "./TodayBanner";
import { NextActionCard } from "./NextActionCard";
import { QuickCaptureForm } from "./QuickCaptureForm";
import { TodayTaskRow, TodayZone, TodayZoneEmpty } from "./TodayTaskRow";

export function TodayView({ initialTasks }: { initialTasks: TodayTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState<TodayFilters>({
    site: "all",
    crew: "all",
    sla: "all",
  });

  const filterOptions = useMemo(() => deriveFilterOptions(tasks), [tasks]);

  const filteredTasks = useMemo(
    () => applyTodayFilters(tasks, filters),
    [tasks, filters],
  );

  const zones = useMemo(() => partitionTodayZones(filteredTasks), [filteredTasks]);
  const inProgressCount = zones.inProgress.length;
  const nextStep = useMemo(
    () => deriveNextAction(filteredTasks, inProgressCount),
    [filteredTasks, inProgressCount],
  );

  const defaultSite = filters.site !== "all" ? filters.site : "";
  const defaultCrew = filters.crew !== "all" ? filters.crew : "operations";

  return (
    <div className="today-page">
      <TodayBanner mit={zones.mit} inProgressCount={inProgressCount} />

      <TodayFiltersBar
        filters={filters}
        sites={filterOptions.sites}
        crews={filterOptions.crews}
        onChange={setFilters}
      />

      <TodayCapacityAlert inProgressCount={inProgressCount} />

      <div className="today-layout">
        <div className="today-main">
          <TodayZone
            id="today-wip-heading"
            title="In Progress"
            countLabel={`${inProgressCount} / ${CREW_CAPACITY}`}
          >
            {zones.inProgress.length ? (
              <ul className="today-list">
                {zones.inProgress.map((task) => (
                  <li key={task.id}>
                    <TodayTaskRow task={task} highlight={task.id === zones.mit?.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <TodayZoneEmpty />
            )}
          </TodayZone>

          <TodayZone id="today-queue-heading" title="Priority Queue" count={zones.priorityQueue.length}>
            {zones.priorityQueue.length ? (
              <ul className="today-list">
                {zones.priorityQueue.map((task) => (
                  <li key={task.id}>
                    <TodayTaskRow task={task} highlight={task.id === zones.mit?.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <TodayZoneEmpty />
            )}
          </TodayZone>

          <TodayZone
            id="today-overdue-heading"
            title="Overdue"
            count={zones.overdue.length}
            variant={zones.overdue.length ? "danger" : "default"}
          >
            {zones.overdue.length ? (
              <ul className="today-list">
                {zones.overdue.map((task) => (
                  <li key={task.id}>
                    <TodayTaskRow task={task} />
                  </li>
                ))}
              </ul>
            ) : (
              <TodayZoneEmpty />
            )}
          </TodayZone>
        </div>

        <aside className="today-sidebar">
          <TodayZone id="today-next-heading" title="Next action" padded>
            <NextActionCard step={nextStep} />
          </TodayZone>

          <TodayZone
            id="today-blockers-heading"
            title="Blockers"
            count={zones.blockers.length}
            variant={zones.blockers.length ? "danger" : "default"}
          >
            {zones.blockers.length ? (
              <ul className="today-list">
                {zones.blockers.map((task) => (
                  <li key={task.id}>
                    <TodayTaskRow task={task} />
                  </li>
                ))}
              </ul>
            ) : (
              <TodayZoneEmpty />
            )}
          </TodayZone>

          <TodayZone id="today-waiting-heading" title="Waiting" count={zones.waiting.length}>
            {zones.waiting.length ? (
              <ul className="today-list">
                {zones.waiting.map((task) => (
                  <li key={task.id}>
                    <TodayTaskRow task={task} showWaitingOn />
                  </li>
                ))}
              </ul>
            ) : (
              <TodayZoneEmpty />
            )}
          </TodayZone>

          <TodayZone id="today-capture-heading" title="Quick capture" padded>
            <QuickCaptureForm
              defaultSite={defaultSite}
              defaultCrew={defaultCrew}
              onCreated={(task) => setTasks((prev) => [task, ...prev])}
            />
          </TodayZone>
        </aside>
      </div>
    </div>
  );
}
