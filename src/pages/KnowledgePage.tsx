import { PageHeader, Panel } from "@/components/ui";
import { useData } from "@/context/DataContext";

export function KnowledgePage() {
  const { data } = useData();

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

        <Panel title="Knowledge entries (Obsidian)">
          <table className="data-table">
            <thead>
              <tr>
                <th>Note</th>
                <th>Type</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {data.notes.map((note) => (
                <tr key={note.id}>
                  <td>{note.title}</td>
                  <td>{note.type}</td>
                  <td className="mono">{note.obsidianPath}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
