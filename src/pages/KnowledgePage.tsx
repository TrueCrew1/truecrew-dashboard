import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel } from "@/components/ui";
import { useData } from "@/context/DataContext";
import {
  fetchObsidianNotes,
  ObsidianVaultError,
  type ObsidianNote,
} from "@/lib/api/client";
import type { Note } from "@/types";

type NoteSource = "supabase" | "obsidian";

type KnowledgeEntry = Note & { source: NoteSource };

type VaultStatus = "syncing" | "live" | "unreachable" | "unconfigured";

function toObsidianEntry(note: ObsidianNote): KnowledgeEntry {
  const syncedAt = note.syncedAt ?? new Date(0).toISOString();

  return {
    id: `obsidian:${note.obsidianPath}`,
    title: note.title,
    type: note.type,
    obsidianPath: note.obsidianPath,
    summary: note.summary ?? "",
    syncedAt,
    createdAt: syncedAt,
    updatedAt: syncedAt,
    createdBy: "operator",
    source: "obsidian",
  };
}

function mergeKnowledgeEntries(
  supabaseNotes: Note[],
  obsidianNotes: ObsidianNote[],
): KnowledgeEntry[] {
  const supabasePaths = new Set(supabaseNotes.map((note) => note.obsidianPath));
  const merged: KnowledgeEntry[] = supabaseNotes.map((note) => ({
    ...note,
    source: "supabase",
  }));

  for (const note of obsidianNotes) {
    if (!supabasePaths.has(note.obsidianPath)) {
      merged.push(toObsidianEntry(note));
    }
  }

  return merged;
}

function matchesKnowledgeSearch(entry: KnowledgeEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return (
    entry.title.toLowerCase().includes(needle) ||
    entry.obsidianPath.toLowerCase().includes(needle) ||
    entry.type.toLowerCase().includes(needle)
  );
}

function SourceBadge({ source }: { source: NoteSource }) {
  return (
    <span className={`source-badge source-badge-${source}`}>
      {source}
    </span>
  );
}

function VaultStatusLabel({
  status,
  vaultCount,
  shownCount,
}: {
  status: VaultStatus;
  vaultCount: number;
  shownCount: number;
}) {
  if (status === "syncing") {
    return <span className="vault-status vault-status-syncing">reading vault…</span>;
  }

  if (status === "unconfigured") {
    return (
      <span className="vault-status vault-status-unconfigured">vault not configured</span>
    );
  }

  if (status === "unreachable") {
    return (
      <span className="vault-status vault-status-unreachable">vault unreachable</span>
    );
  }

  const liveClassName =
    vaultCount === 0 && shownCount === 0
      ? "vault-status vault-status-live vault-status-live--empty"
      : "vault-status vault-status-live";

  return (
    <span className={liveClassName}>
      vault connected · {vaultCount} in vault · {shownCount} shown
    </span>
  );
}

function KnowledgeEntriesBody({
  status,
  vaultError,
  vaultCount,
  entries,
  searchQuery,
  totalEntryCount,
}: {
  status: VaultStatus;
  vaultError: string | null;
  vaultCount: number;
  entries: KnowledgeEntry[];
  searchQuery: string;
  totalEntryCount: number;
}) {
  if (status === "syncing") {
    return (
      <div className="panel-empty" data-empty="knowledge-vault" role="status">
        <EmptyState
          title="Reading Obsidian vault"
          description="Loading markdown notes from the configured vault path."
        />
      </div>
    );
  }

  if (status === "unconfigured") {
    return (
      <div className="panel-empty" data-empty="knowledge-vault" role="status">
        <EmptyState
          title="Obsidian vault not configured"
          description="Set OBSIDIAN_VAULT_PATH in .env.local and run npm run dev:vercel so /api/obsidian/notes can read your local vault."
        />
      </div>
    );
  }

  if (status === "unreachable") {
    return (
      <div className="panel-empty" data-empty="knowledge-vault" role="status">
        <EmptyState
          title="Vault unreachable"
          description={
            vaultError ??
            "The vault path is configured but the API could not read notes. Check permissions and that dev:vercel is running."
          }
        />
      </div>
    );
  }

  if (entries.length === 0) {
    if (totalEntryCount > 0 && searchQuery.trim()) {
      return (
        <div className="panel-empty" data-empty="knowledge-vault" role="status">
          <EmptyState
            title={`No entries match “${searchQuery.trim()}”`}
            description="Try a different title, path, or type keyword."
            variant="filter"
          />
        </div>
      );
    }

    return (
      <div className="panel-empty" data-empty="knowledge-vault" role="status">
        <EmptyState
          title="No knowledge entries"
          description={
            vaultCount === 0
              ? "The vault is connected but contains no readable .md notes yet."
              : "No indexed or vault notes are available to display."
          }
          variant="success"
        />
      </div>
    );
  }

  return (
    <>
      {vaultCount === 0 ? (
        <p className="knowledge-vault-hint" role="status">
          Vault is connected with 0 notes. Showing indexed entries from Supabase only.
        </p>
      ) : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>Note</th>
            <th>Type</th>
            <th>Path</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={`${entry.source}:${entry.id}`}>
              <td>{entry.title}</td>
              <td>{entry.type}</td>
              <td className="mono knowledge-path-cell" title={entry.obsidianPath}>
                {entry.obsidianPath}
              </td>
              <td>
                <SourceBadge source={entry.source} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function KnowledgePage() {
  const { data } = useData();
  const [obsidianNotes, setObsidianNotes] = useState<ObsidianNote[]>([]);
  const [vaultCount, setVaultCount] = useState(0);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>("syncing");
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    setVaultStatus("syncing");
    setVaultError(null);

    fetchObsidianNotes()
      .then(({ notes, configured, count }) => {
        if (cancelled) return;
        setObsidianNotes(notes);
        setVaultCount(count);
        setVaultStatus(configured ? "live" : "unconfigured");
      })
      .catch((error) => {
        if (cancelled) return;
        setObsidianNotes([]);
        setVaultCount(0);
        setVaultError(
          error instanceof ObsidianVaultError ? error.message : "Vault unreachable",
        );
        setVaultStatus("unreachable");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const knowledgeEntries = useMemo(
    () => mergeKnowledgeEntries(data.notes, obsidianNotes),
    [data.notes, obsidianNotes],
  );

  const filteredKnowledgeEntries = useMemo(
    () => knowledgeEntries.filter((entry) => matchesKnowledgeSearch(entry, searchQuery)),
    [knowledgeEntries, searchQuery],
  );

  const showKnowledgeSearch =
    vaultStatus === "live" && knowledgeEntries.length > 0;

  return (
    <>
      <PageHeader
        title="AI &"
        accent="Knowledge"
        subtitle="Prompt library and Obsidian-routed knowledge entries"
      />

      <div className="grid-2">
        <Panel title="Prompt library">
          <table className="data-table">
            <thead>
              <tr>
                <th>Prompt</th>
                <th>Category</th>
                <th>Version</th>
                <th>Workflows</th>
              </tr>
            </thead>
            <tbody>
              {data.prompts.map((prompt) => (
                <tr key={prompt.id}>
                  <td>{prompt.title}</td>
                  <td>{prompt.category}</td>
                  <td className="mono">{prompt.version}</td>
                  <td style={{ color: "var(--steel-dim)" }}>
                    {prompt.linkedWorkflowTypes.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Knowledge entries (Obsidian)"
          action={
            <VaultStatusLabel
              status={vaultStatus}
              vaultCount={vaultCount}
              shownCount={filteredKnowledgeEntries.length}
            />
          }
        >
          {showKnowledgeSearch ? (
            <label className="knowledge-search">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, path, or type…"
                aria-label="Search knowledge entries"
                spellCheck={false}
              />
            </label>
          ) : null}
          <KnowledgeEntriesBody
            status={vaultStatus}
            vaultError={vaultError}
            vaultCount={vaultCount}
            entries={filteredKnowledgeEntries}
            searchQuery={searchQuery}
            totalEntryCount={knowledgeEntries.length}
          />
        </Panel>
      </div>
    </>
  );
}
