import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useChiefApprovals } from "@/components/chief/ChiefApprovalsContext";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import { requestChiefCommandFocus } from "@/components/chief/chiefCommandFocus";
import {
  buildSearchDataContext,
  dispatchAction,
  executeUnifiedSearch,
  type SearchResponse,
  type SearchResult,
  type SuggestedAction,
} from "@/lib/search";

const GROUP_ICONS: Record<string, string> = {
  Projects: "◆",
  Agents: "◎",
  Tasks: "▣",
  Documents: "▤",
  Customers: "◇",
  "Active work": "⚡",
  Research: "⌕",
  Approvals: "✓",
  "Suggested actions": "→",
};

function resultKey(result: SearchResult): string {
  return `${result.type}:${result.id}`;
}

export function CommandBar() {
  const navigate = useNavigate();
  const { data, source } = useData();
  const { approvals } = useChiefApprovals();
  const { allRequests, createSessionRequest, rail } = useResearchRequests();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const searchContext = useMemo(
    () =>
      buildSearchDataContext(data, {
        approvalCandidates: approvals,
        dataRail: source,
        researchRequests: allRequests,
      }),
    [data, approvals, source, allRequests],
  );

  const runSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setResponse(null);
        setStatusMessage(null);
        return;
      }
      const next = executeUnifiedSearch(trimmed, searchContext);
      setResponse(next);
      setStatusMessage(null);
    },
    [searchContext],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => runSearch(query), 120);
    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
      setQuery("");
      setResponse(null);
    },
    [navigate],
  );

  const handleDispatch = useCallback(
    (nextQuery: string) => {
      const nextResponse = executeUnifiedSearch(nextQuery, searchContext);
      const result = dispatchAction(nextResponse.intent, nextResponse, {
        navigate: handleNavigate,
        focusChief: (chiefQuery) => {
          requestChiefCommandFocus(chiefQuery);
          setOpen(false);
        },
        createResearchRequest: (topic) => {
          try {
            return { ...createSessionRequest(topic), rail };
          } catch {
            return null;
          }
        },
      });
      setStatusMessage(result.message);
      if (!result.ok && !result.route) {
        setResponse(nextResponse);
        return;
      }
      if (result.route && result.action !== "chief_query" && result.action !== "route_to_chief") {
        setOpen(false);
        setQuery("");
      }
    },
    [handleNavigate, searchContext, createSessionRequest, rail],
  );

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    handleDispatch(query);
  };

  const onSelectResult = (result: SearchResult) => {
    if (result.route) {
      handleNavigate(result.route);
      return;
    }
    handleDispatch(result.title);
  };

  const onSelectAction = (action: SuggestedAction) => {
    handleDispatch(action.payload?.query ?? query);
  };

  // Reflect the actual data rail (from DataContext), not the VITE_USE_LIVE_API
  // config flag — a live-API build that fell back to mock must not read as "live".
  const sourceLabel =
    source === "supabase"
      ? "live data"
      : source === "mock-fallback"
        ? "mock (live API unavailable)"
        : "mock data";

  return (
    <div className="topbar-search command-bar" ref={rootRef}>
      <form onSubmit={onSubmit}>
        <span className="topbar-search-icon">⌕</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (!query.trim()) return;
            handleDispatch(query);
          }}
          placeholder="Search or command — tasks, agents, roadmaps…"
          aria-label="Global search and command"
          aria-expanded={open}
          aria-controls="command-bar-results"
          autoComplete="off"
        />
        <span className="command-bar-kbd" aria-hidden>
          ⌘K
        </span>
      </form>

      {open && (response || statusMessage) ? (
        <div className="command-bar-panel" id="command-bar-results" role="listbox">
          {statusMessage ? <p className="command-bar-status">{statusMessage}</p> : null}

          {response?.groups.map((group) => (
            <section key={group.type} className="command-bar-group">
              <h3 className="command-bar-group-label">
                {GROUP_ICONS[group.label] ?? "•"} {group.label}
              </h3>
              <ul>
                {group.results.map((result) => (
                  <li key={resultKey(result)}>
                    <button
                      type="button"
                      className="command-bar-item"
                      onClick={() => onSelectResult(result)}
                    >
                      <span className="command-bar-item-title">{result.title}</span>
                      {result.subtitle ? (
                        <span className="command-bar-item-subtitle">{result.subtitle}</span>
                      ) : null}
                      {result.description ? (
                        <span className="command-bar-item-description">{result.description}</span>
                      ) : null}
                      {result.source !== "live" ? (
                        <span
                          className="command-bar-item-source"
                          data-source={result.source}
                        >
                          {result.source}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {response?.suggestedActions.length ? (
            <section className="command-bar-group">
              <h3 className="command-bar-group-label">→ Suggested actions</h3>
              <ul>
                {response.suggestedActions.map((action) => (
                  <li key={action.id}>
                    <button
                      type="button"
                      className="command-bar-item command-bar-item-action"
                      onClick={() => onSelectAction(action)}
                    >
                      <span className="command-bar-item-title">{action.label}</span>
                      <span className="command-bar-item-description">{action.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {response ? (
            <footer className="command-bar-footer">
              {response.totalResults} result(s) · {response.intent.reason} · {sourceLabel}
            </footer>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
