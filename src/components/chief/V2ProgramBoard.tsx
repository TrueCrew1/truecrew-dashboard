import { ApprovalSectionHeader, ApprovalSectionShell } from "./approvalWrappers";
import { V2_PROGRAM_CARDS, type V2ProgramCard } from "@/data/v2Program";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import { deriveV2CardStatus } from "./v2ProgramLiveStatus";

function V2ProgramCardView({ card }: { card: V2ProgramCard }) {
  return (
    <article
      className={`v2-program-card agent-work-card${card.isMaster ? " v2-program-card--master" : ""}`}
      aria-label={card.title}
    >
      <div className="v2-program-card-header">
        <div className="v2-program-card-heading">
          <h3 className="v2-program-card-title">{card.title}</h3>
          <span className="badge badge-red" title="Priority 1">
            {card.priorityBadge}
          </span>
        </div>
        <span className={`badge badge-${card.statusTone}`}>{card.status}</span>
      </div>

      <p className="v2-program-card-purpose">{card.purpose}</p>

      <dl className="v2-program-card-fields">
        <div className="v2-program-card-field">
          <dt>Owner</dt>
          <dd>{card.ownerAgent}</dd>
        </div>
        <div className="v2-program-card-field">
          <dt>Current task</dt>
          <dd>{card.currentTask}</dd>
        </div>
        <div className="v2-program-card-field">
          <dt>Blockers</dt>
          <dd>{card.blockers}</dd>
        </div>
        <div className="v2-program-card-field">
          <dt>Next output</dt>
          <dd>{card.nextOutput}</dd>
        </div>
      </dl>

      <footer className="v2-program-card-footer">
        <span className="v2-program-card-repo">{card.repoRef}</span>
        <span className="v2-program-card-doc">{card.docPath}</span>
      </footer>
    </article>
  );
}

/**
 * V2 Upgrade Program board — the ms-painting repositioning initiative.
 * Deliberately separate from AgentWorkBoard: these are cross-repo program
 * cards (see src/data/v2Program.ts), not entries in Chief's own
 * ChiefSpecialist/AgentWorkItem vocabulary. Master card renders first and
 * larger; all cards are Priority 1 per the program brief
 * (knowledge/projects/ms-painting-v2-program.md).
 */
export function V2ProgramBoard() {
  const { allRequests } = useResearchRequests();
  // Research-workstream cards take their status badge from the live queue row
  // (one source of truth); cards without a linked request keep static status.
  const cards = V2_PROGRAM_CARDS.map((card) => ({
    ...card,
    ...deriveV2CardStatus(card, allRequests),
  }));
  const masterCard = cards.find((card) => card.isMaster);
  const workstreamCards = cards.filter((card) => !card.isMaster);

  return (
    <ApprovalSectionShell className="v2-program-board">
      <ApprovalSectionHeader
        title="V2 Upgrade Program"
        count={`${V2_PROGRAM_CARDS.length} cards`}
      />
      <p className="agent-work-board-note">
        Program cards from <code>src/data/v2Program.ts</code> — card content is static config;
        research-workstream status badges are derived live from the Research queue. Content is
        filed under <code>knowledge/projects/ms-painting-v2-*.md</code>.
      </p>
      <p className="agent-work-board-note">
        ms-painting (TrueCrew1/ms-painting) repositioning initiative — from a single-customer
        implementation into a reusable, resellable True Crew platform. Master card renders first.
      </p>

      {masterCard ? <V2ProgramCardView card={masterCard} /> : null}

      <div className="v2-program-grid">
        {workstreamCards.map((card) => (
          <V2ProgramCardView key={card.id} card={card} />
        ))}
      </div>
    </ApprovalSectionShell>
  );
}
