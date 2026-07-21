import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { useChiefApprovals } from "@/components/chief/ChiefApprovalsContext";
import { useChiefUI } from "@/components/chief/ChiefUIContext";
import { useCommandBarSearch } from "@/lib/search/useCommandBarSearch";
import { runSearchAction } from "@/lib/search/actionRouter";
import type { SearchContext } from "@/lib/search/searchService";
import type { SearchResultGroup, SearchResultItem } from "@/lib/search/types";

const EXAMPLE_QUERIES = [
  "Start research on MS Painting improvement plan",
  "Show agents working on ms-painting",
  "Assign security review to ecosystem",
  "Continue previous work on QuickBooks",
  "Find QuickBooks integration tasks",
];

interface CommandBarProps {
  railOpen: boolean;
  onOpenRail: () => void;
}

function flattenGroups(groups: SearchResultGroup[]): SearchResultItem[] {
  return groups.flatMap((group) => group.items);
}

export function CommandBar({ railOpen, onOpenRail }: CommandBarProps) {
  const navigate = useNavigate();
  const { data } = useData();
  const { setSelectedEntityId } = useSelection();
  const { liveContext, approvals, addHistoryEntry, addCommandApproval } = useChiefApprovals();
  const { requestChiefTab } = useChiefUI();

  const searchContext = useMemo<SearchContext>(
    () => ({ data, liveContext, approvals }),
    [data, liveContext, approvals],
  );

  const {
    query,
    setQuery,
    status,
    groups,
    errorMessage,
    recentSearches,
    commitQuery,
    clearRecentSearches,
    retry,
  } = useCommandBarSearch(searchContext);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [feedback, setFeedback] = useState<{ message: string; tone: "info" | "success" } | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const flatItems = useMemo(() => flattenGroups(groups), [groups]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [groups]);

  // Cmd/Ctrl+K focuses the bar from anywhere in the app.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const showFeedback = (message: string, tone: "info" | "success") => {
    setFeedback({ message, tone });
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 4000);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const selectItem = (item: SearchResultItem) => {
    commitQuery(query);
    setFeedback(null);

    if (item.kind === "action") {
      const outcome = runSearchAction(item.action, {
        navigate,
        requestChiefTab,
        chief: { data, liveContext, approvals, addHistoryEntry, addCommandApproval },
      });
      showFeedback(outcome.message, outcome.tone);
      closeDropdown();
      return;
    }

    if (item.chiefTab) {
      requestChiefTab(item.chiefTab, item.chiefFilter);
    }
    if (item.route) {
      navigate(item.route);
    }
    if (item.entityId) {
      setSelectedEntityId(item.entityId);
      if (!railOpen) onOpenRail();
    }
    closeDropdown();
  };

  const runRecentSearch = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        closeDropdown();
      } else {
        inputRef.current?.blur();
      }
      return;
    }

    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatItems.length === 0) return;
      setActiveIndex((prev) => (prev <= 0 ? flatItems.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        selectItem(flatItems[activeIndex]);
      } else if (flatItems.length > 0) {
        selectItem(flatItems[0]);
      }
    }
  };

  const activeDescendantId =
    activeIndex >= 0 && flatItems[activeIndex] ? `cmdbar-option-${flatItems[activeIndex].id}` : undefined;

  const showEmptyPanel = isOpen && query.trim().length === 0;
  const showResultsPanel = isOpen && query.trim().length > 0;

  return (
    <div
      className="topbar-search cmdbar"
      ref={containerRef}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          closeDropdown();
        }
      }}
    >
      <span className="topbar-search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="cmdbar-listbox"
        aria-activedescendant={activeDescendantId}
        aria-label="Search and command bar"
        autoComplete="off"
        placeholder="Search or tell Chief what to do… (⌘K)"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        // Selecting a result closes the panel without blurring the input
        // (native focus stays put), so a plain click afterwards wouldn't
        // fire a new focus event — handle click explicitly too.
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {status === "loading" ? (
        <span className="cmdbar-spinner" aria-hidden="true" />
      ) : null}

      {feedback ? (
        <div className={`cmdbar-feedback cmdbar-feedback--${feedback.tone}`} role="status">
          {feedback.message}
          <button
            type="button"
            className="cmdbar-feedback-dismiss"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setFeedback(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      {showEmptyPanel ? (
        <div className="cmdbar-panel" id="cmdbar-listbox">
          {recentSearches.length > 0 ? (
            <div className="cmdbar-group">
              <div className="cmdbar-group-header">
                <span>Recent searches</span>
                <button
                  type="button"
                  className="cmdbar-clear-recent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clearRecentSearches}
                >
                  Clear
                </button>
              </div>
              <ul className="cmdbar-item-list">
                {recentSearches.map((entry) => (
                  <li key={entry}>
                    <button
                      type="button"
                      className="cmdbar-item cmdbar-item--recent"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => runRecentSearch(entry)}
                    >
                      <span className="cmdbar-item-icon" aria-hidden="true">
                        ↺
                      </span>
                      <span className="cmdbar-item-title">{entry}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="cmdbar-group">
            <div className="cmdbar-group-header">
              <span>Try asking</span>
            </div>
            <ul className="cmdbar-item-list">
              {EXAMPLE_QUERIES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    className="cmdbar-item cmdbar-item--example"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => runRecentSearch(example)}
                  >
                    <span className="cmdbar-item-title">{example}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {showResultsPanel ? (
        <div className="cmdbar-panel" id="cmdbar-listbox" role="listbox">
          {status === "loading" ? (
            <div className="cmdbar-state cmdbar-state--loading">Searching…</div>
          ) : null}

          {status === "error" ? (
            <div className="cmdbar-state cmdbar-state--error">
              <p>{errorMessage ?? "Search failed — try again."}</p>
              <button
                type="button"
                className="cmdbar-retry"
                onMouseDown={(event) => event.preventDefault()}
                onClick={retry}
              >
                Retry
              </button>
            </div>
          ) : null}

          {status === "empty" ? (
            <div className="cmdbar-state cmdbar-state--empty">
              <p>No matches for "{query.trim()}".</p>
              <p className="cmdbar-state-hint">
                Try a full instruction, like "Start research on…" or "Assign… to ecosystem" — Chief
                can still act on it even without a matching record.
              </p>
            </div>
          ) : null}

          {status === "success"
            ? groups.map((group) => (
                <div className="cmdbar-group" key={group.id}>
                  <div className="cmdbar-group-header">
                    <span>{group.label}</span>
                  </div>
                  <ul className="cmdbar-item-list">
                    {group.items.map((item) => {
                      const flatIndex = flatItems.findIndex((flat) => flat.id === item.id);
                      const isActive = flatIndex === activeIndex;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            id={`cmdbar-option-${item.id}`}
                            role="option"
                            aria-selected={isActive}
                            className={`cmdbar-item cmdbar-item--${item.kind}${isActive ? " cmdbar-item--active" : ""}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            onClick={() => selectItem(item)}
                          >
                            <span className="cmdbar-item-title">{item.title}</span>
                            {item.subtitle ? (
                              <span className="cmdbar-item-subtitle">{item.subtitle}</span>
                            ) : null}
                            {item.meta ? <span className="cmdbar-item-meta">{item.meta}</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
