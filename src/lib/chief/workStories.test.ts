import { test } from "node:test";
import assert from "node:assert/strict";
import { WORK_STORIES } from "./workStories.ts";
import { ADAPTER_RESEARCH_REQUESTS } from "../research/adapterRequests.ts";

// Guards against the stale-id regression where work stories pointed at
// research request ids that no longer exist in the live queue's static
// backlog. Session-created ids can't be validated statically, so a story may
// only reference an adapter-backed id — or omit the field entirely.
test("every work-story researchRequestId resolves to a real adapter request", () => {
  const realIds = new Set(ADAPTER_RESEARCH_REQUESTS.map((request) => request.id));
  for (const story of WORK_STORIES) {
    if (story.researchRequestId === undefined) continue;
    assert.ok(
      realIds.has(story.researchRequestId),
      `Work story "${story.id}" references unknown research request id "${story.researchRequestId}"`,
    );
  }
});
