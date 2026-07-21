import { test } from "node:test";
import assert from "node:assert/strict";
import { runV1IntegrationChecks, type V1CheckStatus } from "../lib/ops/v1IntegrationCheck";

const VALID_STATUSES: ReadonlySet<V1CheckStatus> = new Set(["pass", "partial", "fail", "not_wired"]);

function findCheck(
  checks: Awaited<ReturnType<typeof runV1IntegrationChecks>>["checks"],
  id: string,
) {
  return checks.find((check) => check.id === id);
}

test("runV1IntegrationChecks returns a generated summary with valid statuses", async () => {
  const summary = await runV1IntegrationChecks();

  assert.equal(typeof summary.generatedAt, "string");
  assert.ok(summary.generatedAt.length > 0);
  assert.ok(summary.checks.length > 0);

  for (const check of summary.checks) {
    assert.ok(VALID_STATUSES.has(check.status), `Unexpected status for ${check.id}: ${check.status}`);
  }
});

test("builder report check is wired at least to a truthful capability signal", async () => {
  const summary = await runV1IntegrationChecks();
  const builderCheck = findCheck(summary.checks, "builder_report_capability");

  assert.ok(builderCheck, "Expected builder_report_capability check to be present");
  assert.notEqual(
    builderCheck.status,
    "fail",
    "Builder report capability should not use fail; it should be pass/partial/not_wired",
  );
});

test("merge plan baseline check never claims pass", async () => {
  const summary = await runV1IntegrationChecks();
  const mergePlanCheck = findCheck(summary.checks, "merge_plan_baseline");

  assert.ok(mergePlanCheck, "Expected merge_plan_baseline check to be present");
  assert.notEqual(mergePlanCheck.status, "pass");
  assert.ok(
    mergePlanCheck.status === "partial" ||
      mergePlanCheck.status === "fail" ||
      mergePlanCheck.status === "not_wired",
  );
});

if ((import.meta as ImportMeta & { vitest?: unknown }).vitest) {
  const { test: vitestTest, expect } = await import("vitest");

  vitestTest("runV1IntegrationChecks returns a generated summary with valid statuses", async () => {
    const summary = await runV1IntegrationChecks();

    expect(typeof summary.generatedAt).toBe("string");
    expect(summary.generatedAt.length).toBeGreaterThan(0);
    expect(summary.checks.length).toBeGreaterThan(0);

    for (const check of summary.checks) {
      expect(VALID_STATUSES.has(check.status)).toBe(true);
    }
  });

  vitestTest("builder report check is wired at least to a truthful capability signal", async () => {
    const summary = await runV1IntegrationChecks();
    const builderCheck = findCheck(summary.checks, "builder_report_capability");

    expect(builderCheck).toBeTruthy();
    expect(builderCheck?.status).not.toBe("fail");
  });

  vitestTest("merge plan baseline check never claims pass", async () => {
    const summary = await runV1IntegrationChecks();
    const mergePlanCheck = findCheck(summary.checks, "merge_plan_baseline");

    expect(mergePlanCheck).toBeTruthy();
    expect(mergePlanCheck?.status).not.toBe("pass");
    expect(["partial", "fail", "not_wired"]).toContain(mergePlanCheck?.status);
  });
}
