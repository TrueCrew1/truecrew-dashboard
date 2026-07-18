import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { errorMessage, requireMethod } from "../../lib/http.js";
import { getVaultPath } from "../../lib/obsidian/config.js";
import {
  assertVaultReadable,
  listVaultNotes,
  readVaultNote,
} from "../../lib/obsidian/read.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: "OBSIDIAN_VAULT_PATH is not configured",
    });
  }

  try {
    await assertVaultReadable(vaultPath);
  } catch (error) {
    console.error("Obsidian vault is unreadable", error);
    return res.status(503).json({
      ok: false,
      configured: false,
      error: errorMessage(error, "Vault path is missing or unreadable"),
    });
  }

  const notePath = typeof req.query.path === "string" ? req.query.path.trim() : "";

  try {
    if (notePath) {
      const note = await readVaultNote(vaultPath, notePath);

      if (!note) {
        return res.status(404).json({
          ok: false,
          error: "Note not found",
        });
      }

      return res.status(200).json({ ok: true, note });
    }

    const notes = await listVaultNotes(vaultPath);
    return res.status(200).json({
      ok: true,
      notes,
    });
  } catch (error) {
    console.error("Failed to read Obsidian notes", error);

    if (error instanceof Error && error.message.includes("outside vault")) {
      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      ok: false,
      error: errorMessage(error, "Failed to read notes"),
    });
  }
}
