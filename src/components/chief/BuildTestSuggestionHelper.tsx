/**
 * Advisory Builder test-suggestion helper for pending agent_build approval cards.
 *
 * - Manual trigger only
 * - Output is advisory — does not approve, merge, deploy, or change card state
 * - Human must still use Approve / Send back / Reject
 */

import { useState } from "react";
import { fetchBuildTestSuggestions } from "@/lib/api/suggestTests";
import type { ApprovalProposal } from "./types";

interface BuildTestSuggestionHelperProps {
  proposal: ApprovalProposal;
}

type HelperPhase = "idle" | "loading" | "ready" | "error";

export function BuildTestSuggestionHelper({ proposal }: BuildTestSuggestionHelperProps) {
  const [phase, setPhase] = useState<HelperPhase>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (proposal.source !== "agent_build" || proposal.status !== "pending") {
    return null;
  }

  const handleSuggest = async () => {
    setPhase("loading");
    setErrorMessage(null);

    try {
      const result = await fetchBuildTestSuggestions({
        title: proposal.title,
        summary: proposal.summary,
        recommendedAction: proposal.recommendedAction,
        riskNote: proposal.riskNote,
        checklistLabels: proposal.checklist?.map((item) => item.label),
      });
      setSuggestions(result.suggestions.length > 0 ? result.suggestions : [result.text]);
      setPhase("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not fetch suggestions");
      setPhase("error");
    }
  };

  return (
    <div className="chief-build-test-helper" role="region" aria-label="Advisory test suggestions">
      <div className="chief-build-test-helper-header">
        <span className="chief-approval-card-label">Suggested tests</span>
        <span className="badge badge-steel chief-build-test-helper-badge">Advisory only</span>
      </div>

      <p className="chief-build-test-helper-note" role="note">
        AI suggestions only — human approval required. No automatic changes.
      </p>

      {phase === "idle" || phase === "error" ? (
        <button
          type="button"
          className="chief-btn chief-btn-secondary chief-btn--compact"
          onClick={() => void handleSuggest()}
        >
          Suggest tests
        </button>
      ) : null}

      {phase === "loading" ? (
        <p className="chief-build-test-helper-status" aria-live="polite">
          Generating suggestions…
        </p>
      ) : null}

      {phase === "error" && errorMessage ? (
        <p className="chief-approval-feedback chief-approval-feedback--error" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      {phase === "ready" && suggestions.length > 0 ? (
        <>
          <ul className="chief-approval-checklist chief-build-test-helper-list">
            {suggestions.map((suggestion) => (
              <li key={suggestion} className="chief-approval-checklist-item">
                <span aria-hidden="true">○</span>
                {suggestion}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="chief-btn chief-btn-secondary chief-btn--compact"
            onClick={() => void handleSuggest()}
          >
            Refresh suggestions
          </button>
        </>
      ) : null}
    </div>
  );
}
