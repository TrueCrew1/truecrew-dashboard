import { describe, expect, it } from "vitest";
import { displayNoteType } from "../lib/knowledge/displayNoteType";

describe("displayNoteType (#97/#98 Knowledge display consistency)", () => {
  it("shows 'maintenance' for a Supabase-sourced note even though its raw DB type is the compat 'ticket' value", () => {
    expect(displayNoteType({ type: "ticket", agent: "maintenance" })).toBe("maintenance");
  });

  it("shows 'maintenance' for a vault-sourced note whose raw type is already 'maintenance' (no agent field on vault-only entries)", () => {
    expect(displayNoteType({ type: "maintenance", agent: undefined })).toBe("maintenance");
  });

  it("leaves a Librarian note's real type untouched", () => {
    expect(displayNoteType({ type: "incident", agent: "librarian" })).toBe("incident");
    expect(displayNoteType({ type: "build", agent: "librarian" })).toBe("build");
  });

  it("leaves a note with no known agent untouched (falls through to its raw type)", () => {
    expect(displayNoteType({ type: "decision", agent: undefined })).toBe("decision");
  });
});
