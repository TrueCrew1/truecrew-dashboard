import fs from "node:fs";
import path from "node:path";
import { requireVaultPath } from "../obsidian/config.js";
import { writeVaultNote } from "../obsidian/write.js";
import type { MonitorIncidentPostmortemMission } from "./types.js";

const MISSION_DIR = "Operations/Missions/monitor-incident-postmortem";

function missionRelativePath(missionId: string): string {
  return `${MISSION_DIR}/${missionId}.json`;
}

function missionAbsolutePath(missionId: string): string {
  return path.join(requireVaultPath(), missionRelativePath(missionId));
}

export async function saveMonitorIncidentPostmortemMission(
  mission: MonitorIncidentPostmortemMission,
): Promise<string> {
  const relativePath = missionRelativePath(mission.id);
  await writeVaultNote(relativePath, `${JSON.stringify(mission, null, 2)}\n`);
  return relativePath;
}

export function readMonitorIncidentPostmortemMission(
  missionId: string,
): MonitorIncidentPostmortemMission | null {
  const absolutePath = missionAbsolutePath(missionId);
  if (!fs.existsSync(absolutePath)) return null;
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as MonitorIncidentPostmortemMission;
}

export function readMonitorIncidentPostmortemMissionByProposal(
  proposalId: string,
): MonitorIncidentPostmortemMission | null {
  const vaultPath = requireVaultPath();
  const dir = path.join(vaultPath, MISSION_DIR);
  if (!fs.existsSync(dir)) return null;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const mission = JSON.parse(raw) as MonitorIncidentPostmortemMission;
    if (mission.proposalId === proposalId) return mission;
  }
  return null;
}

export function listMonitorIncidentPostmortemMissions(): MonitorIncidentPostmortemMission[] {
  const vaultPath = requireVaultPath();
  const dir = path.join(vaultPath, MISSION_DIR);
  if (!fs.existsSync(dir)) return [];

  const missions: MonitorIncidentPostmortemMission[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    missions.push(JSON.parse(raw) as MonitorIncidentPostmortemMission);
  }

  return missions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
