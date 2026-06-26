"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { TodayCrew, TodaySlaTier, TodayTask } from "@/lib/today";
import { CREW_LABELS, SLA_LABELS, slaDueFromTier } from "@/lib/today";

const PRIORITY_MAP: Record<string, string> = {
  normal: "medium",
  high: "high",
  critical: "critical",
  low: "low",
};

interface QuickCaptureFormProps {
  defaultSite?: string;
  defaultCrew?: string;
  onCreated: (task: TodayTask) => void;
}

export function QuickCaptureForm({
  defaultSite = "",
  defaultCrew = "operations",
  onCreated,
}: QuickCaptureFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [siteName, setSiteName] = useState(defaultSite);
  const [crew, setCrew] = useState<TodayCrew>(defaultCrew as TodayCrew);
  const [slaTier, setSlaTier] = useState<TodaySlaTier>("standard");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        title: trimmed,
        priority: PRIORITY_MAP[priority] ?? "medium",
        stage: "Inbox",
        workflow_type: "ticket",
        created_by: "founder",
        site_name: siteName.trim() || null,
        crew,
        sla_tier: slaTier,
        due_at: slaDueFromTier(slaTier),
      } as Database["public"]["Tables"]["tasks"]["Insert"])
      .select("*, gate_checks(*)")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    onCreated(data as TodayTask);
    setTitle("");
    setPriority("normal");
    router.refresh();
    setSaving(false);
  }

  return (
    <form className="today-capture-form" onSubmit={handleSubmit} noValidate>
      <div className="today-field">
        <label className="today-field-label" htmlFor="today-capture-title">
          Item
        </label>
        <input
          id="today-capture-title"
          className="today-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to happen?"
          maxLength={120}
        />
      </div>
      <div className="today-field-row">
        <div className="today-field">
          <label className="today-field-label" htmlFor="today-capture-priority">
            Priority
          </label>
          <select
            id="today-capture-priority"
            className="today-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="today-field">
          <label className="today-field-label" htmlFor="today-capture-sla">
            SLA tier
          </label>
          <select
            id="today-capture-sla"
            className="today-select"
            value={slaTier}
            onChange={(e) => setSlaTier(e.target.value as TodaySlaTier)}
          >
            {(Object.keys(SLA_LABELS) as TodaySlaTier[]).map((tier) => (
              <option key={tier} value={tier}>
                {SLA_LABELS[tier]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="today-field-row">
        <div className="today-field">
          <label className="today-field-label" htmlFor="today-capture-site">
            Site
          </label>
          <input
            id="today-capture-site"
            className="today-input"
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="Site name"
          />
        </div>
        <div className="today-field">
          <label className="today-field-label" htmlFor="today-capture-crew">
            Crew
          </label>
          <select
            id="today-capture-crew"
            className="today-select"
            value={crew}
            onChange={(e) => setCrew(e.target.value as TodayCrew)}
          >
            {(Object.keys(CREW_LABELS) as TodayCrew[]).map((c) => (
              <option key={c} value={c}>
                {CREW_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <p className="today-capture-error">{error}</p> : null}
      <button type="submit" className="today-btn today-btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Capture"}
      </button>
    </form>
  );
}
