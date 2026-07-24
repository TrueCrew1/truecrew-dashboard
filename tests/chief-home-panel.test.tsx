// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import type { AgentWorkItem, ApprovalProposal, ChiefBoardItem } from "@/components/chief/types";
import type { BuildGateTask } from "@/components/chief/hooks/useBuildTasks";
import type { ChiefLiveContext } from "@/components/chief/chiefLiveContext";
import { ChiefHomePanel } from "@/components/chief/ChiefHomePanel";

// ---- fixtures ----

function makeApproval(overrides: Partial<ApprovalProposal> = {}): ApprovalProposal {
  return {
    id: "approval-1",
    title: "Approve staging deploy",
    summary: "Ship the staging build to prod",
    recommendedAction: "Approve",
    riskNote: "Low risk",
    status: "pending",
    createdAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

function makeBoardItem(overrides: Partial<ChiefBoardItem> = {}): ChiefBoardItem {
  return {
    id: "board-blocked-task-1",
    lane: "blocked",
    title: "Fix leaking valve",
    detail: "Blocked on parts delivery",
    routeTo: "/tasks/task-1",
    routeLabel: "task",
    tone: "warn",
    ...overrides,
  };
}

function makeBuildGateTask(overrides: Partial<BuildGateTask> = {}): BuildGateTask {
  return {
    id: "build-1",
    title: "Ship pricing page",
    detail: "Build task awaiting required gates",
    tone: "neutral",
    routeTo: "/tasks/build-1",
    routeLabel: "task",
    pendingGates: [],
    ...overrides,
  };
}

function makeAgentWorkItem(overrides: Partial<AgentWorkItem> = {}): AgentWorkItem {
  return {
    id: "research-1",
    agent: "Research Agent",
    task: "Investigate outage root cause",
    status: "active",
    priority: "medium",
    note: "Digging through logs",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

// Only `activeIncidents` is read by ChiefHomePanel before it reaches the
// (mocked) derive functions below, so the rest of the shape is irrelevant here.
const stubLiveContext = { activeIncidents: [] } as unknown as ChiefLiveContext;

// ---- mocks ----
// ChiefHomePanel pulls its lane inputs from several hooks/derive-functions.
// Mocking each at the module boundary lets these tests drive exact lane
// inputs without needing a full DataContext/ChiefApprovalsProvider tree.

const mockUseChiefApprovals = vi.fn();
const mockUseBuildTasks = vi.fn();
const mockDeriveChiefBoardItems = vi.fn();
const mockDeriveResearchAgentWorkItems = vi.fn();

vi.mock("@/context/DataContext", () => ({
  useData: () => ({ data: {} }),
}));

vi.mock("@/components/chief/ChiefApprovalsContext", () => ({
  useChiefApprovals: () => mockUseChiefApprovals(),
}));

vi.mock("@/components/chief/hooks/useBuildTasks", () => ({
  useBuildTasks: () => mockUseBuildTasks(),
}));

vi.mock("@/components/chief/chiefLiveContext", () => ({
  deriveChiefBoardItems: (...args: unknown[]) => mockDeriveChiefBoardItems(...args),
  deriveResearchAgentWorkItems: (...args: unknown[]) => mockDeriveResearchAgentWorkItems(...args),
  resolveChiefCommand: vi.fn(),
}));

// Unrelated to lane behavior and pulls in RecentActivityStrip/monitor-health
// wiring; stub it so these tests only exercise ChiefHomePanel's own markup.
vi.mock("@/components/chief/ChiefSituationBrief", () => ({
  ChiefSituationBrief: () => <div data-testid="situation-brief-stub" />,
}));

function renderPanel() {
  return render(
    <MemoryRouter>
      <ChiefHomePanel />
    </MemoryRouter>,
  );
}

function getLane(name: "Chief" | "Builder" | "Research"): HTMLElement {
  // Panel's own title ("Chief") also renders "Chief" text, so scope the
  // match to the lane-name span specifically.
  const nameNode = screen.getByText(name, { selector: ".chief-home-lane-name" });
  return nameNode.closest(".chief-home-lane") as HTMLElement;
}

function setLaneInputs({
  approvals = [],
  boardItems = [],
  buildGateTasks = [],
  researchWorkItems = [],
}: {
  approvals?: ApprovalProposal[];
  boardItems?: ChiefBoardItem[];
  buildGateTasks?: BuildGateTask[];
  researchWorkItems?: AgentWorkItem[];
}) {
  mockUseChiefApprovals.mockReturnValue({
    liveContext: stubLiveContext,
    approvals,
    addCommandApproval: vi.fn(),
    addHistoryEntry: vi.fn(),
  });
  mockUseBuildTasks.mockReturnValue({ buildGateTasks, isLoading: false, error: null });
  mockDeriveChiefBoardItems.mockReturnValue(boardItems);
  mockDeriveResearchAgentWorkItems.mockReturnValue(researchWorkItems);
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("ChiefHomePanel — Chief lane", () => {
  it("renders approvals and blocked tasks as two separate count chips", () => {
    setLaneInputs({
      approvals: [
        makeApproval({ id: "a1", status: "pending" }),
        makeApproval({ id: "a2", status: "approved" }), // not pending — excluded
      ],
      boardItems: [
        makeBoardItem({ id: "board-blocked-task-1" }),
        makeBoardItem({ id: "board-blocked-task-2" }),
      ],
    });

    renderPanel();

    const chiefLane = getLane("Chief");
    // 1 pending approval, 2 blocked items — shown as two distinct chips,
    // not one summed badge, so each number matches the status text below it.
    expect(within(chiefLane).getByTitle("Pending approvals")).toHaveTextContent("1");
    expect(within(chiefLane).getByTitle("Blocked tasks")).toHaveTextContent("2");
  });

  it("renders the top pending approval's title as the lane detail", () => {
    setLaneInputs({
      approvals: [makeApproval({ id: "a1", title: "Approve staging deploy", status: "pending" })],
      boardItems: [],
    });

    renderPanel();

    const chiefLane = getLane("Chief");
    expect(within(chiefLane).getByText("1 approval")).toBeInTheDocument();
    expect(within(chiefLane).getByText("Approve staging deploy")).toBeInTheDocument();
  });

  it("falls back to the top blocked item's title when there are no pending approvals", () => {
    setLaneInputs({
      approvals: [],
      boardItems: [makeBoardItem({ id: "board-blocked-task-1", title: "Fix leaking valve" })],
    });

    renderPanel();

    const chiefLane = getLane("Chief");
    expect(within(chiefLane).getByText("1 blocker")).toBeInTheDocument();
    expect(within(chiefLane).getByText("Fix leaking valve")).toBeInTheDocument();
  });

  it("renders the 'Review approvals →' CTA", () => {
    setLaneInputs({ approvals: [], boardItems: [] });

    renderPanel();

    expect(
      within(getLane("Chief")).getByRole("button", { name: "Review approvals →" }),
    ).toBeInTheDocument();
  });

  it("scrolls the approval snapshot into view when the CTA is clicked", () => {
    setLaneInputs({
      approvals: [makeApproval({ id: "a1", status: "pending" })],
      boardItems: [],
    });

    renderPanel();

    const cta = within(getLane("Chief")).getByRole("button", { name: "Review approvals →" });
    fireEvent.click(cta);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });
});

describe("ChiefHomePanel — Builder lane", () => {
  it("renders the build task count", () => {
    setLaneInputs({
      buildGateTasks: [
        makeBuildGateTask({ id: "b1" }),
        makeBuildGateTask({ id: "b2" }),
        makeBuildGateTask({ id: "b3" }),
      ],
    });

    renderPanel();

    expect(within(getLane("Builder")).getByText("3")).toBeInTheDocument();
  });

  it("reflects critical (gate-overdue) tone in status text and lane class", () => {
    setLaneInputs({
      buildGateTasks: [
        makeBuildGateTask({ id: "b1", tone: "critical" }),
        makeBuildGateTask({ id: "b2", tone: "warn" }),
      ],
    });

    renderPanel();

    const builderLane = getLane("Builder");
    expect(builderLane).toHaveClass("chief-home-lane--critical");
    expect(within(builderLane).getByText("Gate overdue")).toBeInTheDocument();
  });

  it("reflects warn (gated, not overdue) tone in status text and lane class", () => {
    setLaneInputs({
      buildGateTasks: [makeBuildGateTask({ id: "b1", tone: "warn" })],
    });

    renderPanel();

    const builderLane = getLane("Builder");
    expect(builderLane).toHaveClass("chief-home-lane--warn");
    expect(within(builderLane).getByText("Gated build work")).toBeInTheDocument();
  });

  it("links its CTA to /builds", () => {
    setLaneInputs({ buildGateTasks: [makeBuildGateTask()] });

    renderPanel();

    const link = within(getLane("Builder")).getByRole("link", { name: "Open Builds →" });
    expect(link).toHaveAttribute("href", "/builds");
  });
});

describe("ChiefHomePanel — Research lane", () => {
  it("renders the derived active research item count", () => {
    setLaneInputs({
      researchWorkItems: [
        makeAgentWorkItem({ id: "r1", status: "active" }),
        makeAgentWorkItem({ id: "r2", status: "active" }),
        makeAgentWorkItem({ id: "r3", status: "queued" }), // not active — excluded
      ],
    });

    renderPanel();

    expect(within(getLane("Research")).getByText("2")).toBeInTheDocument();
  });

  it("includes pending approvals routed to the Research Agent in the count", () => {
    setLaneInputs({
      researchWorkItems: [makeAgentWorkItem({ id: "r1", status: "active" })],
      approvals: [
        makeApproval({ id: "a1", specialist: "Research Agent", status: "pending" }),
        // Different specialist — must not be counted in the Research lane.
        makeApproval({ id: "a2", specialist: "Build Agent", status: "pending" }),
        // Research Agent but not pending — must not be counted either.
        makeApproval({ id: "a3", specialist: "Research Agent", status: "approved" }),
      ],
    });

    renderPanel();

    // 1 active research item + 1 pending Research Agent approval = 2
    expect(within(getLane("Research")).getByText("2")).toBeInTheDocument();
  });

  it("links its CTA to /knowledge", () => {
    setLaneInputs({ researchWorkItems: [makeAgentWorkItem()] });

    renderPanel();

    const link = within(getLane("Research")).getByRole("link", { name: "Open Knowledge →" });
    expect(link).toHaveAttribute("href", "/knowledge");
  });
});
