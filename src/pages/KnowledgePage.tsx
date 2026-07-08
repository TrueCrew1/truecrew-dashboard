import { useEffect, useMemo, useState } from "react";
import { PageHeader, Panel, PanelEmpty, TableScroll } from "@/components/ui";
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
}: {
  status: VaultStatus;
  vaultCount: number;
}) {
  if (status === "syncing") {
    return <span className="vault-status vault-status-syncing">syncing…</span>;
  }

  if (status === "unreachable") {
    return (
      <span className="vault-status vault-status-unreachable">vault unreachable</span>
    );
  }

  if (status === "live") {
    return (
      <span className="vault-status vault-status-live">
        {vaultCount} vault {vaultCount === 1 ? "note" : "notes"}
      </span>
    );
  }

  return null;
}

export function KnowledgePage() {
  const { data } = useData();
  const [obsidianNotes, setObsidianNotes] = useState<ObsidianNote[]>([]);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>("syncing");

  useEffect(() => {
    let cancelled = false;

    setVaultStatus("syncing");

    fetchObsidianNotes()
      .then(({ notes, configured }) => {
        if (cancelled) return;
        setObsidianNotes(notes);
        setVaultStatus(configured ? "live" : "unconfigured");
      })
      .catch((error) => {
        if (cancelled) return;
        setObsidianNotes([]);
        if (error instanceof ObsidianVaultError) {
          setVaultStatus("unreachable");
          return;
        }
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

  return (
    <>
      <PageHeader
        title="AI &"
        accent="Knowledge"
        subtitle="Prompt library and Obsidian-routed knowledge entries"
      />

      <div className="grid-2">
        <Panel title="Prompt library">
          {data.prompts.length === 0 ? (
            <PanelEmpty
              emptyKey="knowledge-prompts"
              title="No prompts yet"
              description="Prompts appear here once they're added to the shared library."
            />
          ) : (
            <TableScroll
              label="Prompt library table; scroll horizontally on smaller screens to view version and workflow columns."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Prompt</th>
                    <th scope="col">Category</th>
                    <th scope="col">Version</th>
                    <th scope="col">Workflows</th>
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
            </TableScroll>
          )}
        </Panel>

        <Panel
          title="Knowledge entries (Obsidian)"
          action={
            <VaultStatusLabel status={vaultStatus} vaultCount={obsidianNotes.length} />
          }
        >
          {knowledgeEntries.length === 0 ? (
            <PanelEmpty
              emptyKey="knowledge-entries"
              title="No knowledge entries"
              description={
                vaultStatus === "unreachable"
                  ? "Obsidian vault is unreachable — entries will appear once it's back online."
                  : vaultStatus === "unconfigured"
                    ? "Obsidian vault isn't configured yet — entries will appear once it's connected."
                    : "Entries appear here once notes are added to Supabase or synced from Obsidian."
              }
            />
          ) : (
            <TableScroll
              label="Knowledge entries table; scroll horizontally on smaller screens to view path and source columns."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Note</th>
                    <th scope="col">Type</th>
                    <th scope="col">Task</th>
                    <th scope="col">Path</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {knowledgeEntries.map((entry) => (
                    <tr key={`${entry.source}:${entry.id}`}>
                      <td>{entry.title}</td>
                      <td>{entry.type}</td>
                      <td className="cell-muted">{entry.sourceTaskId ?? "—"}</td>
                      <td className="mono">{entry.obsidianPath}</td>
                      <td>
                        <SourceBadge source={entry.source} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </>
  );
}
