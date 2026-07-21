import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runSecondBrainSync } from "./sync";
import type { SecondBrainSyncSummary } from "./sync";

const VAULT_ENV = "OBSIDIAN_VAULT_PATH";

/** Asserts (and narrows) the summary's discriminant so callers get real property types back. */
function assertStatus<S extends SecondBrainSyncSummary["status"]>(
  summary: SecondBrainSyncSummary,
  status: S,
): asserts summary is Extract<SecondBrainSyncSummary, { status: S }> {
  assert.equal(summary.status, status);
}

async function withVaultEnv<T>(value: string | undefined, fn: () => T | Promise<T>): Promise<T> {
  const previous = process.env[VAULT_ENV];
  if (value === undefined) delete process.env[VAULT_ENV];
  else process.env[VAULT_ENV] = value;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env[VAULT_ENV];
    else process.env[VAULT_ENV] = previous;
  }
}

test("runSecondBrainSync: vault not configured -> skips without throwing", async () => {
  await withVaultEnv("/definitely/not/a/real/vault/path", async () => {
    const summary = await runSecondBrainSync({ result: "success" });
    assertStatus(summary, "not-configured");
    assert.equal(summary.vaultConfigured, false);
    assert.equal(summary.vaultPath, null);
    assert.equal(summary.notesUpdated, 0);
    assert.deepEqual(summary.newSectionsCreated, []);
    assert.equal(summary.buildLogEntry, null);
    assert.match(summary.skippedReason, /OBSIDIAN_VAULT_PATH/);
  });
});

test("runSecondBrainSync: configured vault -> seeds templates once, logs fresh runs, and dedupes an identical repeat", async () => {
  const tempVault = await fs.mkdtemp(path.join(os.tmpdir(), "second-brain-sync-test-vault-"));
  const tempState = await fs.mkdtemp(path.join(os.tmpdir(), "second-brain-sync-test-state-"));

  try {
    await withVaultEnv(tempVault, async () => {
      const first = await runSecondBrainSync({
        result: "success",
        branch: "main",
        commit: "abc1234",
        notes: "test run",
        stateDir: tempState,
      });

      assertStatus(first, "synced");
      assert.equal(first.vaultConfigured, true);
      assert.equal(first.vaultPath, tempVault);
      assert.ok(first.newSectionsCreated.length > 0, "first run should seed templates");
      assert.equal(first.notesUpdated, first.newSectionsCreated.length + 1);
      assert.equal(first.buildLogEntry.obsidianPath, "Operations/Logs/Build Log.md");

      const buildLogPath = first.buildLogEntry.absolutePath;
      const afterFirst = await fs.readFile(buildLogPath, "utf8");
      assert.match(afterFirst, /success/);
      assert.match(afterFirst, /test run/);
      const entryCountAfterFirst = afterFirst.match(/^## /gm)?.length ?? 0;
      assert.equal(entryCountAfterFirst, 1);

      // Same (branch, commit, result, notes) as the first call — simulates the nightly
      // loop re-running against an unchanged commit, or a retry. Must not spam a
      // second, identical Build Log entry.
      const repeat = await runSecondBrainSync({
        result: "success",
        branch: "main",
        commit: "abc1234",
        notes: "test run",
        stateDir: tempState,
      });

      assertStatus(repeat, "deduped");
      assert.equal(repeat.vaultConfigured, true);
      assert.deepEqual(repeat.newSectionsCreated, []);
      assert.equal(repeat.notesUpdated, 0);
      assert.equal(repeat.buildLogEntry, null);
      assert.match(repeat.skippedReason, /[Dd]uplicate/);

      const afterRepeat = await fs.readFile(buildLogPath, "utf8");
      const entryCountAfterRepeat = afterRepeat.match(/^## /gm)?.length ?? 0;
      assert.equal(entryCountAfterRepeat, 1, "deduped repeat must not append a second entry");

      // Result actually changed (e.g. the same commit now fails) — that's new
      // information, so it should log again rather than stay deduped.
      const changed = await runSecondBrainSync({
        result: "failure",
        branch: "main",
        commit: "abc1234",
        notes: "test run",
        stateDir: tempState,
      });

      assertStatus(changed, "synced");
      assert.equal(changed.notesUpdated, 1);
      assert.equal(changed.buildLogEntry.obsidianPath, "Operations/Logs/Build Log.md");

      const afterChanged = await fs.readFile(buildLogPath, "utf8");
      const entryCountAfterChanged = afterChanged.match(/^## /gm)?.length ?? 0;
      assert.equal(entryCountAfterChanged, 2);
    });
  } finally {
    await fs.rm(tempVault, { recursive: true, force: true });
    await fs.rm(tempState, { recursive: true, force: true });
  }
});
