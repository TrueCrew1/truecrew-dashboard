import { describe, expect, it } from "vitest";
import { todayWorkOrdersMock } from "@/data/todayWorkOrdersMock";
import { parseTodayWorkOrdersResponse } from "@/lib/api/parseTodayWorkOrdersResponse";

describe("parseTodayWorkOrdersResponse", () => {
  it("accepts the typed mock payload", () => {
    const parsed = parseTodayWorkOrdersResponse(todayWorkOrdersMock);

    expect(parsed.org_context.org_name).toBe("Demo Field Services");
    expect(parsed.kpi_summary.open_count).toBe(14);
    expect(parsed.status_priority_summary).toHaveLength(
      todayWorkOrdersMock.status_priority_summary.length,
    );
    expect(parsed.work_order_rows[0]?.id).toBe("wo-1042");
    expect(parsed.meta.schema_version).toBe("1");
  });

  it("rejects non-object payloads", () => {
    expect(() => parseTodayWorkOrdersResponse(null)).toThrow(/must be an object/);
    expect(() => parseTodayWorkOrdersResponse([])).toThrow(/must be an object/);
  });

  it("rejects missing required top-level sections", () => {
    expect(() => parseTodayWorkOrdersResponse({})).toThrow(/org_context/);
  });

  it("rejects malformed KPI numbers", () => {
    const payload = {
      ...todayWorkOrdersMock,
      kpi_summary: {
        ...todayWorkOrdersMock.kpi_summary,
        open_count: "14",
      },
    };

    expect(() => parseTodayWorkOrdersResponse(payload)).toThrow(
      /kpi_summary\.open_count must be a number/,
    );
  });

  it("rejects malformed work order rows", () => {
    const payload = {
      ...todayWorkOrdersMock,
      work_order_rows: [{ id: "wo-1", title: 42, status: "open" }],
    };

    expect(() => parseTodayWorkOrdersResponse(payload)).toThrow(
      /work_order_rows\[0\]\.title must be a string/,
    );
  });
});
