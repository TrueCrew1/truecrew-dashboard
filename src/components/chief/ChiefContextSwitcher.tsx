import { useChiefContext } from "@/context/ChiefContextProvider";
import { CHIEF_CONTEXT_LIST, isChiefContextId } from "./chiefContext";

/**
 * The visible truth for Chief's active context — always rendered in the
 * Chief header (ChiefPanel) and on the homepage Chief panel
 * (ChiefHomePanel), so it's never ambiguous whether Chief is looking at the
 * global/parent dashboard or a scoped project like M&S Painting. Switching
 * here calls setActiveContext, which re-scopes every Chief-derived data
 * source in ChiefApprovalsContext — a real state change, not a label.
 */
export function ChiefContextSwitcher() {
  const { activeContext, activeContextDefinition, setActiveContext } = useChiefContext();

  return (
    <div className="chief-context-switcher" title={activeContextDefinition.description}>
      <label className="chief-context-switcher-label" htmlFor="chief-context-select">
        Context
      </label>
      <select
        id="chief-context-select"
        className={`chief-context-switcher-select chief-context-switcher-select--${activeContextDefinition.kind}`}
        value={activeContext}
        onChange={(event) => {
          const next = event.target.value;
          if (isChiefContextId(next)) setActiveContext(next);
        }}
        aria-label="Chief active context"
      >
        {CHIEF_CONTEXT_LIST.map((context) => (
          <option key={context.id} value={context.id}>
            {context.shortLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
