import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isVaultConfigured, resolveVaultAccess } from "../../lib/obsidian/access";
import { listVaultNotes, readVaultNote } from "../../lib/obsidian/read";
import {
  obsidianNoteReadResponse,
  obsidianNotesErrorResponse,
  obsidianNotesListResponse,
} from "../../lib/obsidian/responses";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json(
      obsidianNotesErrorResponse(false, "Method not allowed"),
    );
  }

  const access = await resolveVaultAccess();

  if (access.kind === "missing") {
    return res.status(503).json(
      obsidianNotesErrorResponse(false, access.error),
    );
  }

  if (access.kind === "invalid") {
    return res.status(503).json(
      obsidianNotesErrorResponse(true, access.error),
    );
  }

  const notePath = typeof req.query.path === "string" ? req.query.path.trim() : "";

  try {
    if (notePath) {
      const note = await readVaultNote(access.path, notePath);

      if (!note) {
        return res.status(404).json(
          obsidianNotesErrorResponse(true, "Note not found", notePath),
        );
      }

      return res.status(200).json(obsidianNoteReadResponse(note));
    }

    const notes = await listVaultNotes(access.path);
    return res.status(200).json(obsidianNotesListResponse(notes));
  } catch (error) {
    console.error("Failed to read Obsidian notes", error);

    if (error instanceof Error && error.message.includes("outside vault")) {
      return res.status(400).json(
        obsidianNotesErrorResponse(isVaultConfigured(access), error.message, notePath || undefined),
      );
    }

    if (error instanceof Error && error.message.includes("Only .md notes")) {
      return res.status(400).json(
        obsidianNotesErrorResponse(true, error.message, notePath || undefined),
      );
    }

    return res.status(500).json(
      obsidianNotesErrorResponse(
        true,
        error instanceof Error ? error.message : "Failed to read notes",
      ),
    );
  }
}
