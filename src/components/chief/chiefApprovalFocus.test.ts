import { test } from "node:test";
import assert from "node:assert/strict";
import { requestChiefApprovalFocus, subscribeChiefApprovalFocus } from "./chiefApprovalFocus";

test("chiefApprovalFocus: a subscribed listener receives the requested proposal id", () => {
  const received: string[] = [];
  const unsubscribe = subscribeChiefApprovalFocus((id) => received.push(id));
  requestChiefApprovalFocus("apr-123");
  unsubscribe();
  assert.deepEqual(received, ["apr-123"]);
});

test("chiefApprovalFocus: unsubscribing stops further delivery", () => {
  const received: string[] = [];
  const unsubscribe = subscribeChiefApprovalFocus((id) => received.push(id));
  unsubscribe();
  requestChiefApprovalFocus("apr-should-not-arrive");
  assert.deepEqual(received, []);
});

test("chiefApprovalFocus: every subscribed listener is notified, not just the first", () => {
  const a: string[] = [];
  const b: string[] = [];
  const unsubA = subscribeChiefApprovalFocus((id) => a.push(id));
  const unsubB = subscribeChiefApprovalFocus((id) => b.push(id));
  requestChiefApprovalFocus("apr-456");
  unsubA();
  unsubB();
  assert.deepEqual(a, ["apr-456"]);
  assert.deepEqual(b, ["apr-456"]);
});

test("chiefApprovalFocus: requesting with no subscribers is a safe no-op", () => {
  assert.doesNotThrow(() => requestChiefApprovalFocus("apr-nobody-listening"));
});
