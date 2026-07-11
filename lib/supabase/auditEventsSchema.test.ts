import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../supabase/migrations/20260710000001_audit_events_entity_id_text.sql",
);

describe("audit_events.entity_id migration", () => {
  it("widens entity_id from uuid to text so non-UUID entity ids (e.g. Chief proposal ids) can be written", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");

    expect(sql).toMatch(/alter table public\.audit_events/i);
    expect(sql).toMatch(/alter column entity_id type text/i);
  });
});
