import type { ObsidianNoteDetail, ObsidianNoteSummary } from "./read";

export type ObsidianNotesListResponse = {
  ok: true;
  configured: true;
  notes: ObsidianNoteSummary[];
  count: number;
};

export type ObsidianNoteReadResponse = {
  ok: true;
  configured: true;
  note: ObsidianNoteDetail;
};

export type ObsidianNotesErrorResponse = {
  ok: false;
  configured: boolean;
  error: string;
  path?: string;
};

export type ObsidianNotesResponse =
  | ObsidianNotesListResponse
  | ObsidianNoteReadResponse
  | ObsidianNotesErrorResponse;

export function obsidianNotesListResponse(
  notes: ObsidianNoteSummary[],
): ObsidianNotesListResponse {
  return {
    ok: true,
    configured: true,
    notes,
    count: notes.length,
  };
}

export function obsidianNoteReadResponse(note: ObsidianNoteDetail): ObsidianNoteReadResponse {
  return {
    ok: true,
    configured: true,
    note,
  };
}

export function obsidianNotesErrorResponse(
  configured: boolean,
  error: string,
  path?: string,
): ObsidianNotesErrorResponse {
  return {
    ok: false,
    configured,
    error,
    ...(path ? { path } : {}),
  };
}
