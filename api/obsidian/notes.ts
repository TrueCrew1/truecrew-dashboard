import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { getVaultPath } from "../../lib/obsidian/config.js";
import {
  assertVaultReadable,
  listVaultNotes,
  readVaultNote,
} from "../../lib/obsidian/read.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

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
      error: error instanceof Error ? error.message : "Vault path is missing or unreadable",
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
      error: error instanceof Error ? error.message : "Failed to read notes",
    });
  }
}
