import type { ChiefToolReadResult } from "./types";
import { toolReadSourceLabel, toolReadStateLabel } from "./chiefProjectToolReads";

interface ChiefToolReadBlockProps {
  toolRead: ChiefToolReadResult;
  variant?: "panel" | "home";
}

/**
 * Scanable, read-only presentation of a project-scoped GitHub / Obsidian
 * tool result — source, project, type, count, and items or empty state.
 */
export function ChiefToolReadBlock({ toolRead, variant = "panel" }: ChiefToolReadBlockProps) {
  const rootClass =
    variant === "home"
      ? "chief-tool-read chief-tool-read--home"
      : "chief-tool-read chief-tool-read--panel";

  return (
    <section
      className={`${rootClass} chief-tool-read--${toolRead.source} chief-tool-read--${toolRead.state}`}
      aria-label={`${toolReadSourceLabel(toolRead.source)} tool read`}
    >
      <header className="chief-tool-read-meta">
        <span className="chief-tool-read-pill chief-tool-read-pill--source">
          {toolReadSourceLabel(toolRead.source)}
        </span>
        <span className="chief-tool-read-pill chief-tool-read-pill--project">
          {toolRead.projectLabel}
        </span>
        <span className="chief-tool-read-pill">{toolRead.resultType}</span>
        <span className="chief-tool-read-pill chief-tool-read-pill--count">
          {toolReadStateLabel(toolRead)}
        </span>
        <span className="chief-tool-read-pill chief-tool-read-pill--readonly">Read-only</span>
      </header>

      {toolRead.scopePaths.length > 0 ? (
        <p className="chief-tool-read-scope">
          <span className="chief-tool-read-scope-label">Scope</span>
          {toolRead.scopePaths.join(" · ")}
        </p>
      ) : toolRead.state === "no_scope" ? (
        <p className="chief-tool-read-scope">
          <span className="chief-tool-read-scope-label">Scope</span>
          None — Global is non-project / cross-project only
        </p>
      ) : null}

      {toolRead.state === "ok" && toolRead.items.length > 0 ? (
        <ul className="chief-tool-read-list">
          {toolRead.items.map((item) => (
            <li key={item.id} className="chief-tool-read-item">
              {item.href ? (
                <a
                  className="chief-tool-read-item-title"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.title}
                </a>
              ) : (
                <span className="chief-tool-read-item-title">{item.title}</span>
              )}
              <span className="chief-tool-read-item-detail">{item.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="chief-tool-read-empty" role="status">
          {toolRead.emptyMessage ?? "No results in this project scope."}
        </p>
      )}
    </section>
  );
}
