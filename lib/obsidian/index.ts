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
export type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  ObsidianLogKind,
  ObsidianWriteResult,
  PrLogEntry,
} from "./types.js";
