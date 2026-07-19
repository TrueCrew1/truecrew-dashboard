import { describe, expect, it } from "vitest";
import {
  approvalCardElementId,
  buildChiefApprovalDeepLink,
  CHIEF_APPROVAL_QUERY_PARAM,
  clearChiefApprovalDeepLink,
  parseChiefApprovalDeepLink,
} from "@/lib/navigation/approvalActivityNavigation";

describe("approvalActivityNavigation", () => {
  it("builds and parses chiefApproval deep links", () => {
    const href = buildChiefApprovalDeepLink("apr-research-psh-wf-1", "/");
    expect(href).toBe("/?chiefApproval=apr-research-psh-wf-1");

    const params = new URLSearchParams(href.split("?")[1]);
    expect(parseChiefApprovalDeepLink(params)).toBe("apr-research-psh-wf-1");
  });

  it("clears the deep-link query param", () => {
    const params = new URLSearchParams("chiefApproval=apr-1&foo=bar");
    const cleared = clearChiefApprovalDeepLink(params);
    expect(cleared.get(CHIEF_APPROVAL_QUERY_PARAM)).toBeNull();
    expect(cleared.get("foo")).toBe("bar");
  });

  it("returns stable approval card element ids", () => {
    expect(approvalCardElementId("apr-1")).toBe("approval-proposal-apr-1");
  });
});
