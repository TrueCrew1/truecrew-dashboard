export { getVaultPath, isVaultConfigured, requireVaultPath } from "./config";
export {
  logBuild,
  logDecision,
  logPr,
  updateHotContext,
} from "./log";
export {
  decisionNotePath,
  HOT_CONTEXT_PATH,
  ROLLING_LOG_PATHS,
  sanitizeFilenameSegment,
} from "./paths";
export type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  ObsidianLogKind,
  ObsidianWriteResult,
  PrLogEntry,
} from "./types";
