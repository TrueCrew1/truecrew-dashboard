import type { SpecialistContribution } from "./types";

const SPECIALIST_INITIALS: Record<string, string> = {
  "Workflow Gate Agent": "WG",
  "Librarian Agent": "LB",
  "Research Agent": "RS",
  "Roadmap Agent": "RM",
  "Marketer Agent": "MK",
};

interface SpecialistCardsProps {
  specialists: SpecialistContribution[];
}

export function SpecialistCards({ specialists }: SpecialistCardsProps) {
  if (specialists.length === 0) return null;

  return (
    <div className="chief-specialists" aria-label="Supporting specialist attribution">
      <div className="chief-specialists-header">
        <span className="chief-specialists-label">Supporting specialists</span>
        <span className="chief-specialists-tag">Attribution only</span>
      </div>
      <div className="chief-specialist-list">
        {specialists.map((item) => (
          <div key={item.specialist} className="chief-specialist-card">
            <div
              className="chief-specialist-avatar"
              aria-hidden="true"
              title={item.specialist}
            >
              {SPECIALIST_INITIALS[item.specialist] ?? "?"}
            </div>
            <div className="chief-specialist-body">
              <span className="chief-specialist-name">{item.specialist}</span>
              <p className="chief-specialist-contribution">{item.contribution}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="chief-specialists-note">
        These agents informed Chief’s response above. They do not speak directly.
      </p>
    </div>
  );
}
