import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  GatesCell,
  PageHeader,
  Panel,
  PanelEmpty,
  PanelFilterEmpty,
  StageBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
import { enqueueBuildAgentTestProposal } from "@/components/chief/buildAgentTestProposal";
import {
  proposeResearchProjectSummaryHandoffPacket,
  researchProjectSummaryHandoffProposalId,
} from "@/components/chief/researchProjectSummaryHandoff";
import { useChiefApprovals } from "@/components/chief/ChiefApprovalsContext";
import { TaskCell } from "@/components/tasks/TaskCell";
import { TaskWarningSummary } from "@/components/tasks/TaskWarningSummary";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import {
  missionForProject,
  useProjectSummaryHandoffMissions,
} from "@/hooks/useProjectSummaryHandoffMissions";
import { isLiveApiEnabled } from "@/lib/api/client";
import {
  applyTaskWarningView,
  summarizeTaskWarnings,
  TASK_WARNING_KIND_LABEL,
  taskHasWarning,
  type TaskWarningKind,
} from "../../lib/task-warnings";

type BuildAgentTestFeedback = "queued" | "already_pending" | null;
type HandoffFeedback = "queued" | "already_pending" | null;

function formatMissionStatus(
  status: "queued" | "running" | "completed" | "blocked" | "failed",
): string {
  return status;
}

export function BuildsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const { approvals, addCommandApproval } = useChiefApprovals();
  const { missions: handoffMissions, loading: handoffLoading, error: handoffError } =
    useProjectSummaryHandoffMissions();
  const liveApi = isLiveApiEnabled();
  const [warningKind, setWarningKind] = useState<TaskWarningKind | null>(null);
  const [buildAgentTestFeedback, setBuildAgentTestFeedback] =
    useState<BuildAgentTestFeedback>(null);
  const [handoffFeedback, setHandoffFeedback] = useState<HandoffFeedback>(null);

  function handleProposeBuildAgentTest() {
    const result = enqueueBuildAgentTestProposal(approvals);
    if (result.outcome === "blocked") {
      setBuildAgentTestFeedback("already_pending");
      return;
    }
    addCommandApproval(result.card);
    setBuildAgentTestFeedback("queued");
  }

  function handleProposeProjectSummaryHandoff(workflowId: string) {
    const workflow = buildWorkflows.find((entry) => entry.id === workflowId);
    if (!workflow) return;

    const result = proposeResearchProjectSummaryHandoffPacket(workflow, approvals);
    if (result.outcome === "blocked") {
      setHandoffFeedback("already_pending");
      return;
    }
    addCommandApproval(result.card);
    setHandoffFeedback("queued");
  }

  const buildWorkflows = data.workflows.filter((w) => w.type === "build");
  const buildTasks = data.tasks.filter((t) => t.workflowType === "build");
  const warningContext = useMemo(
    () => ({ customers: data.customers, workflows: data.workflows }),
    [data.customers, data.workflows],
  );
  const warningSummary = summarizeTaskWarnings(buildTasks, warningContext);
  const displayTasks = useMemo(
    () => applyTaskWarningView(buildTasks, warningKind, warningContext),
    [buildTasks, warningKind, warningContext],
  );

  return (
    <>
      <PageHeader
        title="Builds"
        subtitle="Active and historical build workflows with per-build stage tracking"
      />

      <div className="page-stack">
        <Panel
          title="Build Agent approval test"
          action={
            <button type="button" className="empty-state-link" onClick={handleProposeBuildAgentTest}>
              Propose test change
            </button>
          }
        >
          <p className="cell-muted">
            Queue a docs-only Build Agent proposal into Chief&apos;s approval queue for end-to-end
            QA. Review on Chief → Approvals; the Agents tab shows it under Awaiting approval.
          </p>
          {buildAgentTestFeedback === "queued" ? (
            <p className="cell-muted" role="status">
              Queued for operator approval — open Chief → Approvals to decide.
            </p>
          ) : null}
          {buildAgentTestFeedback === "already_pending" ? (
            <p className="cell-muted" role="status">
              Already awaiting approval — review the pending test proposal on Chief → Approvals.
            </p>
          ) : null}
        </Panel>

        <Panel title="Project summary handoff (Research)">
          <p className="cell-muted">
            Propose a governed Research mission for a build workflow. After Chief approval, the
            runner loads live workflow data from Supabase, calls the Research LLM lane, and writes
            the handoff note plus Build Log entry to Obsidian.
          </p>
          {!liveApi ? (
            <p className="cell-muted" role="status">
              Live API is off — enable VITE_USE_LIVE_API to queue and run this mission.
            </p>
          ) : null}
          {handoffError ? (
            <p className="cell-muted" role="status">
              Mission status unavailable: {handoffError}
            </p>
          ) : null}
          {handoffFeedback === "queued" ? (
            <p className="cell-muted" role="status">
              Queued for operator approval — open Chief → Approvals to decide.
            </p>
          ) : null}
          {handoffFeedback === "already_pending" ? (
            <p className="cell-muted" role="status">
              Already awaiting approval for this build workflow.
            </p>
          ) : null}
          {buildWorkflows.length === 0 ? (
            <PanelEmpty
              emptyKey="build-handoff-workflows"
              title="No build workflows"
              description="Add a build workflow in Operations before proposing a project summary handoff."
            />
          ) : (
            <TableScroll wide label="Build workflow handoff proposals">
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Build</th>
                    <th scope="col">Mission status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {buildWorkflows.map((wf) => {
                    const mission = missionForProject(handoffMissions, wf.id);
                    const pending = approvals.some(
                      (proposal) =>
                        proposal.id === researchProjectSummaryHandoffProposalId(wf.id) &&
                        proposal.status === "pending",
                    );
                    return (
                      <tr key={wf.id}>
                        <td className="cell-truncate" title={wf.title}>
                          {wf.title}
                        </td>
                        <td>
                          {handoffLoading && !mission ? (
                            <TableText value="Loading…" />
                          ) : pending ? (
                            <TableText value="awaiting approval" />
                          ) : mission ? (
                            <TableText
                              value={formatMissionStatus(mission.status)}
                              title={mission.error}
                            />
                          ) : (
                            <TableText value="not started" fallback="not started" />
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="empty-state-link"
                            disabled={!liveApi || pending}
                            onClick={() => handleProposeProjectSummaryHandoff(wf.id)}
                          >
                            Propose handoff
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Build workflows">
          {buildWorkflows.length === 0 ? (
            <PanelEmpty
              emptyKey="build-workflows"
              title="No build workflows"
              description="Build workflows appear once feature work is scoped, linked to a branch, and tracked through stage gates."
              action={
                <Link to="/operations" className="empty-state-link">
                  View all workflows in Operations
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Build workflows table; scroll horizontally on smaller screens to view owner and summary columns."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Build</th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Owner
                    </th>
                    <th scope="col">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {buildWorkflows.map((wf) => {
                    const rowId = wf.linkedTaskIds[0] ?? wf.id;
                    return (
                      <tr
                        key={wf.id}
                        className={`clickable-row${selectedEntityId === rowId ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(rowId)}
                      >
                        <td className="cell-truncate" title={wf.title}>
                          {wf.title}
                        </td>
                        <td>
                          <StageBadge stage={wf.stage} />
                        </td>
                        <td>
                          <TableText value={wf.owner} fallback="Unassigned" />
                        </td>
                        <td>
                          <TableText value={wf.summary} clamp2 />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Build tasks">
          <TaskWarningSummary
            summary={warningSummary}
            activeKind={warningKind}
            onKindSelect={setWarningKind}
          />
          {buildTasks.length === 0 ? (
            <PanelEmpty
              emptyKey="build-tasks"
              title="No build tasks"
              description={
                buildWorkflows.length > 0
                  ? "Workflows exist but no build tasks are linked yet. Open a branch and assign gates to populate this list."
                  : "Tasks linked to build workflows show up here once branches are opened and gates are assigned."
              }
              action={
                <Link to="/operations" className="empty-state-link">
                  {buildWorkflows.length > 0
                    ? "Open Operations to link tasks"
                    : "View all workflows in Operations"}
                </Link>
              }
            />
          ) : displayTasks.length === 0 && warningKind ? (
            <PanelFilterEmpty
              emptyKey="build-tasks-warning-filter"
              filterLabel={TASK_WARNING_KIND_LABEL[warningKind]}
              description="No build tasks match this warning kind right now."
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
              label="Build tasks table; scroll horizontally on smaller screens to view GitHub ref and gate status."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-ref">
                      GitHub ref
                    </th>
                    <th scope="col" className="col-gates">
                      Open gates
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
                        <StageBadge stage={task.stage} />
                      </td>
                      <td>
                        <TableText value={task.githubRef} mono truncate />
                      </td>
                      <td>
                        <GatesCell gates={task.gates} />
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
