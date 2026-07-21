import { test } from "node:test";
import assert from "node:assert/strict";
import { withInternalAuthHeader } from "./client";

test("withInternalAuthHeader attaches x-internal-key when a key is provided", () => {
  const headers = withInternalAuthHeader({ "Content-Type": "application/json" }, "secret-value");
  assert.equal(headers.get("x-internal-key"), "secret-value");
  assert.equal(headers.get("Content-Type"), "application/json");
});

test("withInternalAuthHeader trims whitespace off the key", () => {
  const headers = withInternalAuthHeader(undefined, "  secret-value  \n");
  assert.equal(headers.get("x-internal-key"), "secret-value");
});

test("withInternalAuthHeader omits the header when no key is configured", () => {
  const headers = withInternalAuthHeader(undefined, undefined);
  assert.equal(headers.has("x-internal-key"), false);
});

test("withInternalAuthHeader omits the header when the key is blank", () => {
  const headers = withInternalAuthHeader(undefined, "   ");
  assert.equal(headers.has("x-internal-key"), false);
});
