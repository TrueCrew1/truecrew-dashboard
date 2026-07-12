import {
  decisionNotePath,
  HOT_CONTEXT_PATH,
  maintenanceNotePath,
  planningNotePath,
  researchFindingNotePath,
  ROLLING_LOG_PATHS,
} from "./paths.js";
import {
  renderBuildLogSection,
  renderBuildLogSeed,
  renderDecisionNote,
  renderHotContextNote,
  renderMaintenanceNote,
  renderPlanningNote,
  renderPrLogSection,
  renderPrLogSeed,
  renderResearchFindingNote,
} from "./templates.js";
import type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  MaintenanceLogEntry,
  ObsidianWriteResult,
  PlanningLogEntry,
  PrLogEntry,
  ResearchFindingLogEntry,
} from "./types.js";
import { appendVaultNote, writeVaultNote } from "./write.js";

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

export async function logMaintenance(entry: MaintenanceLogEntry): Promise<ObsidianWriteResult> {
  const relativePath = maintenanceNotePath(entry.title, entry.loggedAt);
  const absolutePath = await writeVaultNote(relativePath, renderMaintenanceNote(entry));
  return toResult(relativePath, absolutePath);
}

export async function logPlanning(entry: PlanningLogEntry): Promise<ObsidianWriteResult> {
  const relativePath = planningNotePath(entry.title, entry.loggedAt);
  const absolutePath = await writeVaultNote(relativePath, renderPlanningNote(entry));
  return toResult(relativePath, absolutePath);
}

export async function logResearchFinding(
  entry: ResearchFindingLogEntry,
): Promise<ObsidianWriteResult> {
  const relativePath = researchFindingNotePath(entry.title, entry.loggedAt);
  const absolutePath = await writeVaultNote(relativePath, renderResearchFindingNote(entry));
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
