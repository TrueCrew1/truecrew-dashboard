import { describe, expect, it } from "vitest";
import { todayWorkOrdersMock } from "@/data/todayWorkOrdersMock";
import type { TodayWorkOrdersState } from "@/hooks/useTodayWorkOrders";
import { buildTodayScaffoldView, mapWorkOrderStatusVariant } from "@/pages/todayWorkOrdersView";
import type { TodayWorkOrdersResponse, TodayWorkOrderStatus } from "@/types/todayWorkOrders";

function emptyResponse(): TodayWorkOrdersResponse {
  return {
    ...todayWorkOrdersMock,
    work_order_rows: [],
    needs_attention_items: [],
    meta: {
      ...todayWorkOrdersMock.meta,
      empty: true,
    },
  };
}

describe("buildTodayScaffoldView", () => {
  it("maps loading page state to loading section phases", () => {
    const view = buildTodayScaffoldView({ status: "loading" });

    expect(view).toEqual({
      kind: "content",
      sections: {
        org: { phase: "loading" },
        kpis: { phase: "loading" },
        statusSummary: { phase: "loading" },
        needsAttention: { phase: "loading" },
        workOrders: { phase: "loading" },
        approval: { phase: "loading" },
      },
    });
  });

  it("maps ready page state to ready section data", () => {
    const state: TodayWorkOrdersState = {
      status: "ready",
      data: todayWorkOrdersMock,
    };

    const view = buildTodayScaffoldView(state);
    if (view.kind !== "content") {
      throw new Error("expected content view");
    }

    expect(view.sections.org).toEqual({
      phase: "ready",
      data: {
        orgName: "Demo Field Services",
        membershipRole: "Supervisor",
      },
    });
    expect(view.sections.kpis.phase).toBe("ready");
    expect(view.sections.statusSummary.phase).toBe("ready");
    expect(view.sections.needsAttention.phase).toBe("ready");
    expect(view.sections.workOrders.phase).toBe("ready");

    if (view.sections.workOrders.phase !== "ready") {
      throw new Error("expected ready work orders");
    }
    expect(view.sections.workOrders.data[0]).toMatchObject({
      id: "wo-1042",
      title: "WO-1042 · Pump seal replacement",
      statusLabel: "Scheduled",
      crewLabel: "Crew A",
    });
  });

  it("maps empty page state to empty list sections while keeping org and KPIs ready", () => {
    const state: TodayWorkOrdersState = {
      status: "empty",
      data: emptyResponse(),
    };

    const view = buildTodayScaffoldView(state);
    if (view.kind !== "content") {
      throw new Error("expected content view");
    }

    expect(view.sections.org.phase).toBe("ready");
    expect(view.sections.kpis.phase).toBe("ready");
    expect(view.sections.statusSummary.phase).toBe("empty");
    expect(view.sections.needsAttention.phase).toBe("empty");
    expect(view.sections.workOrders.phase).toBe("empty");
    expect(view.sections.approval.phase).toBe("ready");
  });

  it("maps error page state without building sections", () => {
    expect(
      buildTodayScaffoldView({ status: "error", error: "Today work orders API returned 503" }),
    ).toEqual({
      kind: "error",
      error: "Today work orders API returned 503",
    });
  });
});

describe("mapWorkOrderStatusVariant", () => {
  const cases: Array<{ status: TodayWorkOrderStatus; variant: "steel" | "blue" | "orange" | "yellow" }> = [
    { status: "open", variant: "steel" },
    { status: "scheduled", variant: "blue" },
    { status: "in_progress", variant: "orange" },
    { status: "waiting", variant: "yellow" },
    { status: "queued", variant: "steel" },
  ];

  it.each(cases)("maps $status to $variant", ({ status, variant }) => {
    expect(mapWorkOrderStatusVariant(status)).toBe(variant);
  });

  it("falls back to steel for unknown status strings", () => {
    expect(mapWorkOrderStatusVariant("on_hold")).toBe("steel");
    expect(mapWorkOrderStatusVariant("completed")).toBe("steel");
  });
});
