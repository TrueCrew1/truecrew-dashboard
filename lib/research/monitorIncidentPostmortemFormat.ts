export interface IncidentPostmortemContext {
  id: string;
  title: string;
  severity: number;
  status: string;
  serviceName: string;
  summary: string;
  openedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  linkedRepairId?: string;
}

export interface ParsedPostmortemContent {
  incidentSummary: string;
  likelyCauses: string[];
  impacts: string[];
  recommendedActions: string[];
  followUpNotes: string;
}

export function buildMonitorIncidentPostmortemPrompt(incident: IncidentPostmortemContext): string {
  return `You are the Research agent for True Crew, an operations command center for field maintenance teams.

Produce a concise monitor incident postmortem brief for the active incident below.
Respond with JSON only — no markdown fences, no commentary.

Required JSON shape:
{
  "incidentSummary": "string",
  "likelyCauses": ["string"],
  "impacts": ["string"],
  "recommendedActions": ["string"],
  "followUpNotes": "string"
}

Incident:
- id: ${incident.id}
- title: ${incident.title}
- severity: ${incident.severity}
- status: ${incident.status}
- service: ${incident.serviceName}
- opened_at: ${incident.openedAt}
- summary: ${incident.summary}
${incident.mitigatedAt ? `- mitigated_at: ${incident.mitigatedAt}` : ""}
${incident.resolvedAt ? `- resolved_at: ${incident.resolvedAt}` : ""}
${incident.linkedRepairId ? `- linked_repair_id: ${incident.linkedRepairId}` : ""}
`.trim();
}

export function parsePostmortemContent(raw: string): ParsedPostmortemContent {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("LLM response was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM response JSON must be an object");
  }

  const record = parsed as Record<string, unknown>;
  const incidentSummary = String(record.incidentSummary ?? "").trim();
  const followUpNotes = String(record.followUpNotes ?? "").trim();

  if (!incidentSummary) {
    throw new Error("LLM response missing required incidentSummary");
  }

  const likelyCauses = Array.isArray(record.likelyCauses)
    ? record.likelyCauses.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const impacts = Array.isArray(record.impacts)
    ? record.impacts.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const recommendedActions = Array.isArray(record.recommendedActions)
    ? record.recommendedActions.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    incidentSummary,
    likelyCauses,
    impacts,
    recommendedActions,
    followUpNotes,
  };
}

export function renderMonitorIncidentPostmortemNote(input: {
  incident: IncidentPostmortemContext;
  postmortem: ParsedPostmortemContent;
  proposalId: string;
  missionId: string;
}): string {
  const { incident, postmortem, proposalId, missionId } = input;
  const causes =
    postmortem.likelyCauses.length > 0
      ? postmortem.likelyCauses.map((item) => `- ${item}`).join("\n")
      : "- (none identified)";
  const impacts =
    postmortem.impacts.length > 0
      ? postmortem.impacts.map((item) => `- ${item}`).join("\n")
      : "- (none identified)";
  const actions =
    postmortem.recommendedActions.length > 0
      ? postmortem.recommendedActions.map((item) => `- ${item}`).join("\n")
      : "- (none identified)";

  return `---
type: monitor-incident-postmortem
mission_kind: research:monitor-incident-postmortem
incident_id: ${incident.id}
proposal_id: ${proposalId}
mission_id: ${missionId}
generated_at: ${new Date().toISOString()}
---

# Monitor Incident Postmortem — ${incident.title}

## Incident summary

${postmortem.incidentSummary}

## Likely causes

${causes}

## Impacts

${impacts}

## Recommended actions

${actions}

## Follow-up notes

${postmortem.followUpNotes || "(none)"}
`;
}

export function postmortemNotePath(incidentTitle: string): string {
  const safe = incidentTitle.replace(/[\\/:*?"<>|]/g, "-").trim();
  return `Operations/Handoffs/Monitor Incident Postmortem — ${safe}.md`;
}

export function postmortemArtifactJsonPath(missionId: string): string {
  return `Operations/Handoffs/${missionId}-postmortem.json`;
}
