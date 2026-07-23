import { useId } from "react";
import { useChiefContext } from "@/context/ChiefContextProvider";
import { isChiefContextId } from "./chiefContext";

/**
 * Project selector for Chief — options from ChiefContextProvider.contextList
 * (Global + deriveAppProjects / known catalog). Switching re-scopes Chief
 * data and exposes activeToolScope for GitHub/Obsidian routing.
 */
export function ChiefContextSwitcher() {
  const { activeContext, activeContextDefinition, contextList, setActiveContext } =
    useChiefContext();
  const selectId = useId();

  return (
    <div className="chief-context-switcher" title={activeContextDefinition.description}>
      <label className="chief-context-switcher-label" htmlFor={selectId}>
        Project
      </label>
      <select
        id={selectId}
        className={`chief-context-switcher-select chief-context-switcher-select--${activeContextDefinition.kind}`}
        value={activeContext}
        onChange={(event) => {
          const next = event.target.value;
          if (isChiefContextId(next, contextList)) setActiveContext(next);
        }}
        aria-label="Chief project"
      >
        {contextList.map((context) => (
          <option key={context.id} value={context.id}>
            {context.shortLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
