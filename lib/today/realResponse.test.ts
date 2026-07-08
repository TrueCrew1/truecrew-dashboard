import { afterEach, describe, expect, it, vi } from "vitest";
import type { TodayOrgContext } from "../../src/types/todayWorkOrders.js";

const { fetchWorkOrderTasksMock, buildKpiSummaryMock, buildWorkOrderRowsMock } = vi.hoisted(
  () => ({
    fetchWorkOrderTasksMock: vi.fn(),
    buildKpiSummaryMock: vi.fn(),
    buildWorkOrderRowsMock: vi.fn(),
  }),
);

vi.mock("./workOrderTasks.js", () => ({
  fetchWorkOrderTasks: fetchWorkOrderTasksMock,
  buildKpiSummary: buildKpiSummaryMock,
  buildWorkOrderRows: buildWorkOrderRowsMock,
}));

import { buildRealTodayWorkOrdersResponse } from "./realResponse.js";

const ORG_CONTEXT: TodayOrgContext = {
  org_id: "org-test-001",
  org_name: "Test Field Services",
  membership_role: "Supervisor",
  membership_status: "active",
};

describe("buildRealTodayWorkOrdersResponse", () => {
  afterEach(() => {
    fetchWorkOrderTasksMock.mockReset();
    buildKpiSummaryMock.mockReset();
    buildWorkOrderRowsMock.mockReset();
  });

  it("composes org_context + real kpi/row builders and forces the deferred sections empty", async () => {
    const tasks = [{ id: "task-1" }];
    const rows = [{ id: "task-1", title: "Pump seal replacement", status: "in_progress" }];
    fetchWorkOrderTasksMock.mockResolvedValue(tasks);
    buildKpiSummaryMock.mockReturnValue({ open_count: 1, in_progress_count: 1 });
    buildWorkOrderRowsMock.mockReturnValue(rows);

    const result = await buildRealTodayWorkOrdersResponse(ORG_CONTEXT);

    expect(result.org_context).toEqual(ORG_CONTEXT);
    expect(result.work_order_rows).toBe(rows);
    expect(result.kpi_summary).toEqual({ open_count: 1, in_progress_count: 1 });
    expect(result.status_priority_summary).toEqual([]);
    expect(result.needs_attention_items).toEqual([]);
    expect(result.meta.empty).toBe(false);
    expect(buildKpiSummaryMock).toHaveBeenCalledWith(tasks, expect.any(Date));
    expect(buildWorkOrderRowsMock).toHaveBeenCalledWith(tasks, expect.any(Date));
  });

  it("reports meta.empty true when no rows are returned", async () => {
    fetchWorkOrderTasksMock.mockResolvedValue([]);
    buildKpiSummaryMock.mockReturnValue({ open_count: 0 });
    buildWorkOrderRowsMock.mockReturnValue([]);

    const result = await buildRealTodayWorkOrdersResponse(ORG_CONTEXT);

    expect(result.work_order_rows).toEqual([]);
    expect(result.meta.empty).toBe(true);
  });
});
