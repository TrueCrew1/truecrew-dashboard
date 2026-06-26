import { useState } from "react";
import { Panel } from "@/components/ui";
import type { CreateTaskInput } from "@/lib/today/types";

interface QuickCaptureProps {
  onCreate: (input: CreateTaskInput) => Promise<void>;
}

export function QuickCapture({ onCreate }: QuickCaptureProps) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ title: trimmed });
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel title="Quick Capture">
      <form className="quick-capture" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Capture a task — press Enter to save"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          autoComplete="off"
        />
        <button type="submit" className="quick-capture-btn" disabled={submitting || !title.trim()}>
          {submitting ? "Saving…" : "Add"}
        </button>
        {error ? <p className="quick-capture-error">{error}</p> : null}
      </form>
    </Panel>
  );
}
