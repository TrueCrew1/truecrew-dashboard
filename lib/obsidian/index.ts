export { getVaultPath, isVaultConfigured, requireVaultPath } from "./config.js";
export {
  logBuild,
  logDecision,
  logPr,
  updateHotContext,
} from "./log.js";
export {
  decisionNotePath,
  HOT_CONTEXT_PATH,
  ROLLING_LOG_PATHS,
  sanitizeFilenameSegment,
} from "./paths.js";
export { seedVaultTemplates } from "./seed.js";
export { runSecondBrainSync } from "./sync.js";
export type { SeedVaultTemplatesResult } from "./seed.js";
export type { SecondBrainSyncOptions, SecondBrainSyncSummary } from "./sync.js";
export type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  ObsidianLogKind,
  ObsidianWriteResult,
  PrLogEntry,
} from "./types.js";
