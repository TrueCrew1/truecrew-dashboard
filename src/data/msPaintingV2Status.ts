/**
 * M&S Painting V2 Progress — typed local status for the Today dashboard module.
 * Static snapshot until a project-status store/API exists; update this file when
 * filing or subsystem states change. Not connected to ops mock DataContext.
 */

export type MsPaintingV2PackageState = "FILED" | "MISSING" | "DRAFT" | "BLOCKED";

export type MsPaintingV2SubsystemState =
  | "NOT LIVE"
  | "DEGRADED"
  | "CONFIG ONLY"
  | "OPERATIONAL";

export type MsPaintingV2BadgeTone = "green" | "red" | "yellow" | "orange" | "blue" | "steel";

export interface MsPaintingV2PackageStatus {
  id: string;
  label: string;
  state: MsPaintingV2PackageState;
}

export interface MsPaintingV2SubsystemStatus {
  id: string;
  label: string;
  state: MsPaintingV2SubsystemState;
}

export interface MsPaintingV2ProgressStatus {
  title: string;
  packages: MsPaintingV2PackageStatus[];
  subsystems: MsPaintingV2SubsystemStatus[];
  currentPriority: {
    label: string;
    nextExecutableSlice: string;
  };
  knownBlockers: string[];
}

export const MS_PAINTING_V2_PROGRESS_STATUS: MsPaintingV2ProgressStatus = {
  title: "M&S Painting V2 Progress",
  packages: [
    {
      id: "0100",
      label: "0100 - Repair + Security + Monitoring Baseline",
      state: "FILED",
    },
    {
      id: "0200",
      label: "0200 - V2 Estimating Engine",
      state: "FILED",
    },
    {
      id: "0300",
      label: "0300 - Live Mode Enablement and Gate Resolution",
      state: "FILED",
    },
    {
      id: "0400",
      label: "0400 - Program-Level Founder Decision Summary",
      state: "FILED",
    },
  ],
  subsystems: [
    { id: "research", label: "Research", state: "NOT LIVE" },
    { id: "build", label: "Build", state: "DEGRADED" },
    { id: "librarian", label: "Librarian", state: "NOT LIVE" },
    { id: "monitor", label: "Monitor", state: "CONFIG ONLY" },
  ],
  currentPriority: {
    label: "P0: 0300 - Live Mode Enablement and Gate Resolution",
    nextExecutableSlice:
      "dependency + gate inventory, then baseline discovery for 0100",
  },
  knownBlockers: [
    "Live API mode required for mission handoff",
    "Build task(s) blocked on open gates",
    "Librarian filing depends on live API + Supabase",
    "Monitor probes require live API mode",
  ],
};

/** Badge tone for package filing states — distinct from button styles. */
export function packageStateBadgeTone(state: MsPaintingV2PackageState): MsPaintingV2BadgeTone {
  switch (state) {
    case "FILED":
      return "green";
    case "DRAFT":
      return "blue";
    case "BLOCKED":
      return "red";
    case "MISSING":
      return "steel";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Badge tone for subsystem operational states. */
export function subsystemStateBadgeTone(
  state: MsPaintingV2SubsystemState,
): MsPaintingV2BadgeTone {
  switch (state) {
    case "OPERATIONAL":
      return "green";
    case "DEGRADED":
      return "orange";
    case "CONFIG ONLY":
      return "yellow";
    case "NOT LIVE":
      return "red";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
