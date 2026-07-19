import fs from "node:fs";
import path from "node:path";
import { requireVaultPath } from "../obsidian/config.js";
import { writeVaultNote } from "../obsidian/write.js";
import type { ProjectSummaryHandoffMission } from "./types.js";

const MISSION_DIR = "Operations/Missions/project-summary-handoff";

function missionRelativePath(missionId: string): string {
  return `${MISSION_DIR}/${missionId}.json`;
}

function missionAbsolutePath(missionId: string): string {
  return path.join(requireVaultPath(), missionRelativePath(missionId));
}

export async function saveProjectSummaryHandoffMission(
  mission: ProjectSummaryHandoffMission,
): Promise<string> {
  const relativePath = missionRelativePath(mission.id);
  await writeVaultNote(relativePath, `${JSON.stringify(mission, null, 2)}\n`);
  return relativePath;
}

export function readProjectSummaryHandoffMission(
  missionId: string,
): ProjectSummaryHandoffMission | null {
  const absolutePath = missionAbsolutePath(missionId);
  if (!fs.existsSync(absolutePath)) return null;
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as ProjectSummaryHandoffMission;
}

export function readProjectSummaryHandoffMissionByProposal(
  proposalId: string,
): ProjectSummaryHandoffMission | null {
  const vaultPath = requireVaultPath();
  const dir = path.join(vaultPath, MISSION_DIR);
  if (!fs.existsSync(dir)) return null;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const mission = JSON.parse(raw) as ProjectSummaryHandoffMission;
    if (mission.proposalId === proposalId) return mission;
  }
  return null;
}

export function listProjectSummaryHandoffMissions(): ProjectSummaryHandoffMission[] {
  const vaultPath = requireVaultPath();
  const dir = path.join(vaultPath, MISSION_DIR);
  if (!fs.existsSync(dir)) return [];

  const missions: ProjectSummaryHandoffMission[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    missions.push(JSON.parse(raw) as ProjectSummaryHandoffMission);
  }

  return missions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
