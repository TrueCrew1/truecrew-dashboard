import { useEffect, useMemo, useState } from "react";
import { PageHeader, Panel } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { fetchObsidianNotes, type ObsidianNote } from "@/lib/api/client";
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

    fetchObsidianNotes().then(({ notes, vaultState }) => {
      if (cancelled) return;
      setObsidianNotes(notes);
      setVaultStatus(vaultState);
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
            <VaultStatusLabel status={vaultStatus} vaultCount={obsidianNotes.length} />
          }
        >
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
              {knowledgeEntries.map((entry) => (
                <tr key={`${entry.source}:${entry.id}`}>
                  <td>{entry.title}</td>
                  <td>{entry.type}</td>
                  <td className="mono">{entry.obsidianPath}</td>
                  <td>
                    <SourceBadge source={entry.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
