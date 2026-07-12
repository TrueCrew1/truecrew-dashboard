export { getVaultPath, isVaultConfigured, requireVaultPath } from "./config.js";
export {
  logBuild,
  logDecision,
  logPr,
  logResearchFinding,
  updateHotContext,
} from "./log.js";
export {
  decisionNotePath,
  HOT_CONTEXT_PATH,
  researchFindingNotePath,
  ROLLING_LOG_PATHS,
  sanitizeFilenameSegment,
} from "./paths.js";
export type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  ObsidianLogKind,
  ObsidianWriteResult,
  PrLogEntry,
  ResearchFindingLogEntry,
  ResearchFindingTier,
} from "./types.js";
