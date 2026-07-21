import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getSeededCustomerIds,
  getSeededIncidentIds,
  getSeededPromptIds,
  getSeededRunbookIds,
  getSeededTaskIds,
  getSeededToolIds,
  getSeededWorkflowIds,
} from "../src/lib/mockSeedCoherence";

const SEED_FILE_RELATIVE_PATH = "supabase/migrations/20260626000002_seed_data.sql";

function loadSeedSql(): string {
  return fs.readFileSync(path.resolve(process.cwd(), SEED_FILE_RELATIVE_PATH), "utf8");
}

function assertIdsInSeed(ids: string[], sql: string, category: string): void {
  for (const id of ids) {
    assert.ok(sql.includes(id), `Expected ${category} id "${id}" to appear in ${SEED_FILE_RELATIVE_PATH}`);
  }
}

test("mock/seed coherence: every mock task id has a matching seed row", () => {
  assertIdsInSeed(getSeededTaskIds(), loadSeedSql(), "task");
});

test("mock/seed coherence: every mock workflow id has a matching seed row", () => {
  assertIdsInSeed(getSeededWorkflowIds(), loadSeedSql(), "workflow");
});

test("mock/seed coherence: every mock tool id has a matching seed row", () => {
  assertIdsInSeed(getSeededToolIds(), loadSeedSql(), "tool");
});

test("mock/seed coherence: every mock incident id has a matching seed row", () => {
  assertIdsInSeed(getSeededIncidentIds(), loadSeedSql(), "incident");
});

test("mock/seed coherence: every mock customer id has a matching seed row", () => {
  assertIdsInSeed(getSeededCustomerIds(), loadSeedSql(), "customer");
});

test("mock/seed coherence: every mock runbook id has a matching seed row", () => {
  assertIdsInSeed(getSeededRunbookIds(), loadSeedSql(), "runbook");
});

test("mock/seed coherence: every mock prompt id has a matching seed row", () => {
  assertIdsInSeed(getSeededPromptIds(), loadSeedSql(), "prompt");
});
