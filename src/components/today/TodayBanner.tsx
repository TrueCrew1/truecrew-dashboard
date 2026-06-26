import type { TodayTask } from "@/lib/today";
import { CREW_CAPACITY } from "@/lib/today";
import { scoreReasons } from "@/lib/today";

function formatTodayDate() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function capacityClass(count: number) {
  if (count >= CREW_CAPACITY) return "wip-over";
  if (count >= CREW_CAPACITY - 2) return "wip-near";
  return "wip-ok";
}

export function TodayBanner({
  mit,
  inProgressCount,
}: {
  mit: TodayTask | null;
  inProgressCount: number;
}) {
  const reasons = mit ? scoreReasons(mit).slice(0, 2).join(" · ") : null;

  return (
    <section className="today-banner" aria-label="Today overview">
      <div className="today-banner-left">
        <p className="today-date">{formatTodayDate()}</p>
        {mit ? (
          <>
            <p className="today-mit-label">Most important now</p>
            <h1 className="today-mit-title">{mit.title}</h1>
            {reasons ? <p className="today-mit-reason">{reasons}</p> : null}
          </>
        ) : (
          <>
            <p className="today-mit-label">Most important now</p>
            <h1 className="today-mit-title today-mit-clear">Queue is clear</h1>
          </>
        )}
      </div>
      <div className="today-banner-right">
        <div
          className={`today-wip-gauge ${capacityClass(inProgressCount)}`}
          aria-label={`Crew in progress: ${inProgressCount} of ${CREW_CAPACITY}`}
        >
          <span className="today-wip-count">
            {inProgressCount}
            <span className="today-wip-max"> / {CREW_CAPACITY}</span>
          </span>
          <span className="today-wip-label">Crew capacity</span>
        </div>
        <button type="button" className="today-btn today-btn-ghost">
          Daily review
        </button>
      </div>
    </section>
  );
}

export function TodayCapacityAlert({ inProgressCount }: { inProgressCount: number }) {
  if (inProgressCount < CREW_CAPACITY) return null;

  return (
    <div className="today-alert today-alert-danger" role="alert">
      <strong>Crew capacity reached ({inProgressCount} / {CREW_CAPACITY}).</strong>
      Close in-progress work before starting additional items across the crew.
    </div>
  );
}
