import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadLocalEnv } from "../../lib/obsidian/load-env";
import { isVaultConfigured } from "../../lib/obsidian/config";
import { listVaultNotes } from "../../lib/obsidian/read";

loadLocalEnv();

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!isVaultConfigured()) {
    return res.status(200).json({
      notes: [],
      configured: false,
    });
  }

  try {
    const notes = await listVaultNotes();
    return res.status(200).json({
      notes,
      configured: true,
    });
  } catch (error) {
    console.error("Failed to read Obsidian vault", error);
    return res.status(503).json({
      notes: [],
      configured: true,
      error: error instanceof Error ? error.message : "Vault unreachable",
    });
  }
}
