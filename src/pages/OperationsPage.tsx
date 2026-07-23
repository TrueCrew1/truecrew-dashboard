import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  GatesCell,
  PageHeader,
  Panel,
  PanelEmpty,
  PanelFilterEmpty,
  StageBadge,
  StatusBadge,
  TableScroll,
  TableText,
  TaskStageSelect,
} from "@/components/ui";
import { proposePlannerReprioritization } from "@/components/chief/plannerReprioritizationProposal";
import { proposePlannerNewRoadmapPhase } from "@/components/chief/plannerNewRoadmapPhaseProposal";
import { useChiefApprovals } from "@/components/chief/ChiefApprovalsContext";
import { TaskCell } from "@/components/tasks/TaskCell";
import { TaskWarningSummary } from "@/components/tasks/TaskWarningSummary";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { formatDataSourceLabel } from "@/lib/api/client";
import {
  applyTaskWarningView,
  summarizeTaskWarnings,
  TASK_WARNING_KIND_LABEL,
  taskHasWarning,
  type TaskWarningKind,
} from "../../lib/task-warnings";
import {
  filterTasksByShiftParam,
  isOpenTaskStage,
  SHIFT_FILTER_LABELS,
  type ShiftFilter,
} from "../../lib/queries/dashboard-stats";

function isShiftFilter(value: string | null): value is ShiftFilter {
  return value === "open-work-orders" || value === "overdue-pms";
}

type OperationsTaskFilter = Exclude<ShiftFilter, "active-incidents">;

const FILTER_EMPTY_COPY: Record<OperationsTaskFilter, string> = {
  "open-work-orders":
    "This filter shows repair and ticket tasks in open stages. None match right now.",
  "overdue-pms":
    "This filter shows open tasks past their due date. Nothing is overdue at the moment.",
};

type PlannerSignalFeedback = "queued" | "already_pending" | "no_signal" | null;

export function OperationsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data, source } = useData();
  const { liveContext, approvals, addCommandApproval } = useChiefApprovals();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");
  const [warningKind, setWarningKind] = useState<TaskWarningKind | null>(null);
  const [plannerSignalFeedback, setPlannerSignalFeedback] =
    useState<PlannerSignalFeedback>(null);
  const [plannerPhaseFeedback, setPlannerPhaseFeedback] =
    useState<PlannerSignalFeedback>(null);

  function handleProposePlannerReprioritization() {
    const result = proposePlannerReprioritization(liveContext, approvals);
    if (result.outcome === "queued") {
      addCommandApproval(result.card);
    }
    setPlannerSignalFeedback(
      result.outcome === "blocked" ? "already_pending" : result.outcome,
    );
  }

  function handleProposePlannerNewRoadmapPhase() {
    const result = proposePlannerNewRoadmapPhase(liveContext, approvals);
    if (result.outcome === "queued") {
      addCommandApproval(result.card);
    }
    setPlannerPhaseFeedback(
      result.outcome === "blocked" ? "already_pending" : result.outcome,
    );
  }

  const activeWorkflows = useMemo(
    () => data.workflows.filter((wf) => isOpenTaskStage(wf.stage)),
    [data.workflows],
  );

  const filteredTasks = useMemo(
    () => filterTasksByShiftParam(data.tasks, filter),
    [data.tasks, filter],
  );

  const filterLabel = isShiftFilter(filter) ? SHIFT_FILTER_LABELS[filter] : null;
  const warningContext = useMemo(
    () => ({ customers: data.customers, workflows: data.workflows }),
    [data.customers, data.workflows],
  );
  const warningSummary = summarizeTaskWarnings(filteredTasks, warningContext);
  const displayTasks = useMemo(
    () => applyTaskWarningView(filteredTasks, warningKind, warningContext),
    [filteredTasks, warningKind, warningContext],
  );

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle={`Active workflows and tasks · data source: ${formatDataSourceLabel(source)}`}
      />

      {filterLabel ? (
        <div className="filter-banner" role="status">
          Filtered: {filterLabel} ·{" "}
          <Link to="/operations" className="filter-banner-clear">
            Clear filter
          </Link>
        </div>
      ) : null}

      <div className="page-stack">
        <Panel
          title="Planner re-sequencing signal"
          action={
            <button
              type="button"
              className="empty-state-link"
              onClick={handleProposePlannerReprioritization}
            >
              Check overdue work
            </button>
          }
        >
          <p className="cell-muted">
            When open tasks are past due, Planner files a roadmap re-sequencing
            proposal into Chief&apos;s approval queue. Review on Chief &rarr;
            Approvals; the Agents tab shows it under Awaiting approval.
          </p>
          {plannerSignalFeedback === "queued" ? (
            <p className="cell-muted" role="status">
              Queued for operator approval — open Chief &rarr; Approvals to decide.
            </p>
          ) : null}
          {plannerSignalFeedback === "already_pending" ? (
            <p className="cell-muted" role="status">
              Already awaiting approval — review the pending re-sequencing proposal on Chief
              &rarr; Approvals.
            </p>
          ) : null}
          {plannerSignalFeedback === "no_signal" ? (
            <p className="cell-muted" role="status">
              No overdue open tasks right now — nothing to re-sequence.
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Planner new roadmap phase signal"
          action={
            <button
              type="button"
              className="empty-state-link"
              onClick={handleProposePlannerNewRoadmapPhase}
            >
              Check decision focus
            </button>
          }
        >
          <p className="cell-muted">
            When the focus queue holds decision-type items, Planner files a new
            roadmap phase proposal into Chief&apos;s approval queue. Review on Chief
            &rarr; Approvals; the Agents tab shows it under Awaiting approval.
          </p>
          {plannerPhaseFeedback === "queued" ? (
            <p className="cell-muted" role="status">
              Queued for operator approval — open Chief &rarr; Approvals to decide.
            </p>
          ) : null}
          {plannerPhaseFeedback === "already_pending" ? (
            <p className="cell-muted" role="status">
              Already awaiting approval — review the pending new-phase proposal on Chief
              &rarr; Approvals.
            </p>
          ) : null}
          {plannerPhaseFeedback === "no_signal" ? (
            <p className="cell-muted" role="status">
              No decision focus items right now — nothing to start as a new phase.
            </p>
          ) : null}
        </Panel>

        <Panel title="Active workflows">
          {activeWorkflows.length === 0 ? (
            <PanelEmpty
              emptyKey="workflows"
              title={
                data.workflows.length === 0
                  ? "No workflows yet"
                  : "No active workflows"
              }
              description={
                data.workflows.length === 0
                  ? "Workflows appear here when builds, deploys, repairs, or onboarding pipelines are in flight."
                  : "All workflows are closed or archived. Nothing is in an open stage right now."
              }
              variant={data.workflows.length === 0 ? "default" : "success"}
              action={
                <Link to="/" className="empty-state-link">
                  Return to Today
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Active workflows table; scroll horizontally on smaller screens to view type, stage, owner, and gates."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Workflow</th>
                    <th scope="col" className="col-type">
                      Type
                    </th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Owner
                    </th>
                    <th scope="col" className="col-gates">
                      Open gates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeWorkflows.map((wf) => (
                    <tr
                      key={wf.id}
                      className={`clickable-row${selectedEntityId === wf.linkedTaskIds[0] ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(wf.linkedTaskIds[0] ?? wf.id)}
                    >
                      <td className="cell-truncate" title={wf.title}>
                        {wf.title}
                      </td>
                      <td>
                        <StatusBadge status={wf.type} variant="steel" />
                      </td>
                      <td>
                        <StageBadge stage={wf.stage} />
                      </td>
                      <td>
                        <TableText value={wf.owner} fallback="Unassigned" />
                      </td>
                      <td>
                        <GatesCell gates={wf.gates} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title={filterLabel ? `Tasks · ${filterLabel}` : "All tasks"}>
          <TaskWarningSummary
            summary={warningSummary}
            activeKind={warningKind}
            onKindSelect={setWarningKind}
          />
          {data.tasks.length === 0 ? (
            <PanelEmpty
              emptyKey="tasks"
              title="No tasks yet"
              description="Tasks are created from workflows and will show up here once work begins."
            />
          ) : filteredTasks.length === 0 && filterLabel ? (
            <PanelFilterEmpty
              emptyKey="tasks-filter"
              filterLabel={filterLabel}
              description={FILTER_EMPTY_COPY[filter as OperationsTaskFilter]}
              clearAction={
                <Link to="/operations" className="empty-state-link">
                  Clear filter and show all tasks
                </Link>
              }
            />
          ) : displayTasks.length === 0 && warningKind ? (
            <PanelFilterEmpty
              emptyKey="tasks-warning-filter"
              filterLabel={TASK_WARNING_KIND_LABEL[warningKind]}
              description={
                filterLabel
                  ? `No tasks in this view match the ${TASK_WARNING_KIND_LABEL[warningKind]} warning. Try clearing the warning filter or shift filter.`
                  : `No tasks match the ${TASK_WARNING_KIND_LABEL[warningKind]} warning right now.`
              }
              clearAction={
                <button
                  type="button"
                  className="empty-state-link"
                  onClick={() => setWarningKind(null)}
                >
                  Clear warning filter
                </button>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Tasks table; scroll horizontally on smaller screens to view type, priority, stage, and assignee."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col" className="col-type">
                      Type
                    </th>
                    <th scope="col" className="col-priority">
                      Priority
                    </th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Assignee
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={[
                        "clickable-row",
                        selectedEntityId === task.id ? "selected" : "",
                        taskHasWarning(task, warningContext) ? "task-row--warned" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedEntityId(task.id)}
                    >
                      <td>
                        <TaskCell task={task} />
                      </td>
                      <td>
                        <StatusBadge status={task.workflowType} variant="steel" />
                      </td>
                      <td>
                        <StatusBadge
                          status={task.priority}
                          variant={
                            task.priority === "critical"
                              ? "red"
                              : task.priority === "high"
                                ? "orange"
                                : "steel"
                          }
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <TaskStageSelect taskId={task.id} stage={task.stage} />
                      </td>
                      <td>
                        <TableText value={task.assignee} fallback="Unassigned" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </>
  );
}
