import {
  decisionNotePath,
  HOT_CONTEXT_PATH,
  ROLLING_LOG_PATHS,
} from "./paths";
import {
  renderBuildLogSection,
  renderBuildLogSeed,
  renderDecisionNote,
  renderHotContextNote,
  renderPrLogSection,
  renderPrLogSeed,
} from "./templates";
import type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  ObsidianWriteResult,
  PrLogEntry,
} from "./types";
import { appendVaultNote, writeVaultNote } from "./write";

function toResult(relativePath: string, absolutePath: string): ObsidianWriteResult {
  return { obsidianPath: relativePath, absolutePath };
}

export async function logBuild(entry: BuildLogEntry): Promise<ObsidianWriteResult> {
  const relativePath = ROLLING_LOG_PATHS.build;
  const absolutePath = await appendVaultNote(
    relativePath,
    renderBuildLogSection(entry),
    renderBuildLogSeed(),
  );
  return toResult(relativePath, absolutePath);
}

export async function logDecision(entry: DecisionLogEntry): Promise<ObsidianWriteResult> {
  const relativePath = decisionNotePath(entry.title, entry.loggedAt);
  const absolutePath = await writeVaultNote(relativePath, renderDecisionNote(entry));
  return toResult(relativePath, absolutePath);
}

export async function logPr(entry: PrLogEntry): Promise<ObsidianWriteResult> {
  const relativePath = ROLLING_LOG_PATHS.pr;
  const absolutePath = await appendVaultNote(
    relativePath,
    renderPrLogSection(entry),
    renderPrLogSeed(),
  );
  return toResult(relativePath, absolutePath);
}

export async function updateHotContext(entry: HotContextEntry): Promise<ObsidianWriteResult> {
  const relativePath = HOT_CONTEXT_PATH;
  const absolutePath = await writeVaultNote(relativePath, renderHotContextNote(entry));
  return toResult(relativePath, absolutePath);
}
