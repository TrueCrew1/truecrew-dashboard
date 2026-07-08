import { sanitizeFilenameSegment } from "../obsidian/paths";
import type { ArtifactDraft } from "./types";

export function artifactNotePath(draft: ArtifactDraft, loggedAt = new Date()): string {
  const date = loggedAt.toISOString().slice(0, 10);
  const safeTitle = sanitizeFilenameSegment(draft.pathSegment || draft.title);
  return `Operations/Artifacts/${date} — ${safeTitle}.md`;
}
