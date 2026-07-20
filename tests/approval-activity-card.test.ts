import { describe, expect, it } from "vitest";
import {
  APPROVAL_ACTIVITY_LIVE_NOTE,
  APPROVAL_ACTIVITY_MOCK_MODE_NOTE,
} from "@/components/chief/approvalActivityHelpers";

describe("ApprovalActivityCard contract", () => {
  it("uses honest mock and live mode notes", () => {
    expect(APPROVAL_ACTIVITY_MOCK_MODE_NOTE).toMatch(/session only/i);
    expect(APPROVAL_ACTIVITY_MOCK_MODE_NOTE).toMatch(/not persisted/i);
    expect(APPROVAL_ACTIVITY_LIVE_NOTE).toMatch(/vault activity records/i);
  });
});
