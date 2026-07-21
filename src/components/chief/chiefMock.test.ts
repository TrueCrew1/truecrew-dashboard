import { test } from "node:test";
import assert from "node:assert/strict";
import { stableChiefId } from "./chiefMock";

test("stableChiefId: same prefix and seed always produces the same id", () => {
  const first = stableChiefId("apr-cmd", "what is at risk today?|");
  const second = stableChiefId("apr-cmd", "what is at risk today?|");
  assert.equal(first, second);
});

test("stableChiefId: a different seed produces a different id", () => {
  const a = stableChiefId("apr-cmd", "what is at risk today?|");
  const b = stableChiefId("apr-cmd", "what is blocked?|");
  assert.notEqual(a, b);
});

test("stableChiefId: id is '<prefix>-<8 lowercase hex chars>'", () => {
  const id = stableChiefId("apr-cmd", "some command|some title");
  assert.match(id, /^apr-cmd-[0-9a-f]{8}$/);
});

test("stableChiefId: the hash suffix only depends on the seed, not the prefix", () => {
  const seed = "what is at risk today?|";
  const a = stableChiefId("apr-cmd", seed);
  const b = stableChiefId("apr-build", seed);
  // Hash suffix is always "-" + 8 hex chars, so the last 9 characters isolate it.
  assert.equal(a.slice(-9), b.slice(-9));
});
