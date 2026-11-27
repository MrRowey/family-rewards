"use client";

import { useId, useRef, useState } from "react";
import type { TaskItem } from "@/features/admin/types";

export function EditChore({ task, onUpdated }: { task: TaskItem; onUpdated: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(task);
  const [steps, setSteps] = useState("");
  const fieldClass = "block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white";
  return <>
    <button type="button" className="min-h-11 rounded-lg bg-slate-800 px-4 text-sm font-semibold" onClick={() => {
      setDraft(task); setSteps(task.subSteps?.map(step => step.title).join("\n") ?? ""); setError(""); dialog.current?.showModal();
    }}>Edit Chore</button>
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { if (inFlight.current) event.preventDefault(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[min(32rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-100 backdrop:bg-black/65">
      <h3 id={titleId} className="mb-4 text-lg font-bold">Edit Chore</h3>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (inFlight.current) return;
        inFlight.current = true; setSaving(true); setError("");
        try {
          const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: task.id, title: draft.title, icon: draft.icon, category: draft.category ?? "", starValue: draft.starValue, subSteps: steps.split("\n").map(step => step.trim()).filter(Boolean) }) });
          if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Could not update chore."); }
          await onUpdated();
          dialog.current?.close();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update chore."); }
        finally { inFlight.current = false; setSaving(false); }
      }}>
        <fieldset disabled={saving} className="space-y-3">
          <label className="block">Title<input className={fieldClass} required maxLength={100} value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})}/></label>
          <label className="block">Icon emoji<input className={fieldClass} required maxLength={64} value={draft.icon} onChange={e => setDraft({...draft, icon: e.target.value})}/></label>
          <label className="block">Star award<input className={fieldClass} type="number" required min={1} max={100000} step={1} value={draft.starValue} onChange={e => setDraft({...draft, starValue: Number(e.target.value)})}/></label>
          <label className="block">Category<input className={fieldClass} maxLength={60} value={draft.category ?? ""} onChange={e => setDraft({...draft, category: e.target.value})}/></label>
          <label className="block">Sub-steps (one per line)<textarea className={fieldClass} rows={5} value={steps} onChange={e => setSteps(e.target.value)}/></label>
          <p className="text-sm text-slate-300">Existing schedules and earned stars are retained. Resolve pending approvals before changing the star award.</p>
        </fieldset>
        <output className="block text-sm text-rose-300">{error}</output>
        <div className="flex gap-3">
          <button type="button" disabled={saving} className="min-h-11 flex-1 rounded-lg bg-slate-800" onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" disabled={saving} className="min-h-11 flex-1 rounded-lg bg-indigo-600">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </dialog>
  </>;
}
