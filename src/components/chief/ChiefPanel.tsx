import { FormEvent, useState } from "react";
import { resolveChiefCommand } from "./chiefMock";
import type { ChiefResponse } from "./types";

const EXAMPLE_COMMANDS = [
  "What's blocking deploy?",
  "Search knowledge for deploy checklist",
  "Status overview for today",
];

export function ChiefPanel() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const command = input.trim();
    if (!command || isProcessing) return;

    setIsProcessing(true);
    window.setTimeout(() => {
      setResponse(resolveChiefCommand(command));
      setIsProcessing(false);
    }, 480);
  };

  const handleExample = (example: string) => {
    setInput(example);
  };

  return (
    <aside className="chief-panel" aria-label="Chief command layer">
      <div className="chief-header">
        <div className="chief-mark" aria-hidden="true">
          C
        </div>
        <div className="chief-header-text">
          <span className="chief-title">Chief</span>
          <span className="chief-subtitle">Command layer</span>
        </div>
      </div>

      <div className="chief-body">
        {!response && !isProcessing ? (
          <div className="chief-empty">
            <p className="chief-empty-lead">Command Chief</p>
            <p className="chief-empty-desc">
              Summarize status, check gates, or route to a specialist. Responses are
              advisory—nothing executes without your approval.
            </p>
            <div className="chief-examples">
              <span className="chief-examples-label">Examples</span>
              {EXAMPLE_COMMANDS.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="chief-example-btn"
                  onClick={() => handleExample(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isProcessing ? (
          <div className="chief-processing" aria-live="polite">
            <span className="chief-processing-dot" aria-hidden="true" />
            Routing command…
          </div>
        ) : null}

        {response && !isProcessing ? (
          <article className="chief-response-card">
            <div className="chief-response-section">
              <h3 className="chief-response-label">Summary</h3>
              <p className="chief-response-text">{response.summary}</p>
            </div>

            {response.blockers && response.blockers.length > 0 ? (
              <div className="chief-response-section">
                <h3 className="chief-response-label">Blockers</h3>
                <ul className="chief-blocker-list">
                  {response.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="chief-response-section">
              <h3 className="chief-response-label">Recommended action</h3>
              <p className="chief-response-text chief-response-text--action">
                {response.recommendedAction}
              </p>
            </div>

            {response.approvalNeeded ? (
              <div className="chief-response-section chief-approval">
                <div className="chief-approval-header">
                  <h3 className="chief-response-label">Approval needed</h3>
                  <span className="chief-approval-badge">Required</span>
                </div>
                <p className="chief-response-text chief-approval-prompt">
                  {response.approvalPrompt ?? "This action requires your confirmation."}
                </p>
                <div className="chief-approval-actions">
                  <button type="button" className="chief-btn chief-btn-primary" disabled>
                    Approve
                  </button>
                  <button type="button" className="chief-btn" disabled>
                    Decline
                  </button>
                </div>
                <p className="chief-approval-note">Preview only — not wired in v1.</p>
              </div>
            ) : null}

            <footer className="chief-attribution">
              <span className="chief-attribution-label">Routed to</span>
              <span className="chief-attribution-agent">{response.routedTo}</span>
            </footer>
          </article>
        ) : null}
      </div>

      <form className="chief-input-form" onSubmit={handleSubmit}>
        <label className="chief-input-label" htmlFor="chief-command">
          Command
        </label>
        <div className="chief-input-row">
          <input
            id="chief-command"
            type="text"
            className="chief-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. What's blocking deploy?"
            aria-label="Chief command input"
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="chief-submit"
            disabled={!input.trim() || isProcessing}
            title={!input.trim() ? "Enter a command to run" : undefined}
          >
            Run
          </button>
        </div>
      </form>
    </aside>
  );
}
