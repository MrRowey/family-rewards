"use client";

import { useState } from "react";

const phrase = "REPLACE FAMILY DATA";

export function RestoreBackup({ onRestore }: { onRestore: () => Promise<void> }) {
  const [file, setFile] = useState<File>();
  const [backup, setBackup] = useState<unknown>();
  const [summary, setSummary] = useState<Record<string, number>>();
  const [confirmation, setConfirmation] = useState("");
  const [savedCurrent, setSavedCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(restore: boolean) {
    if (busy || !file || (restore && (!summary || !savedCurrent || confirmation !== phrase))) return;
    setBusy(true);
    setMessage("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose a backup smaller than 10 MB.");
      const snapshot = restore ? backup : JSON.parse(await file.text());
      const response = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: snapshot, ...(restore && { confirmation }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not read the backup.");
      if (restore) {
        setSummary(undefined);
        setBackup(undefined);
        setConfirmation("");
        setSavedCurrent(false);
        setMessage("Family data restored.");
        await onRestore();
      } else {
        setBackup(snapshot);
        setSummary(result.summary);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not process the backup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-w-0 space-y-4 rounded-xl border border-slate-800 p-5">
      <h4 className="font-semibold">Restore family data</h4>
      <p className="text-sm text-slate-300">Restore replaces family records. Keep a separate copy of uploaded photos. Your current parent PIN and kiosk settings stay in place.</p>
      <label className="grid gap-2 text-sm">
        Backup file (.json)
        <input type="file" className="max-w-full text-sm" accept=".json,application/json" disabled={busy}
          onChange={(event) => {
            setFile(event.target.files?.[0]);
            setSummary(undefined);
            setBackup(undefined);
            setConfirmation("");
            setSavedCurrent(false);
            setMessage("");
          }} />
      </label>
      <button type="button" disabled={!file || busy} onClick={() => submit(false)}
        className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm disabled:opacity-50">Preview backup</button>
      {summary && (
        <div className="space-y-4 border-t border-slate-800 pt-4">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {Object.entries(summary).map(([key, count]) => (
              <div key={key}><dt className="capitalize text-slate-400">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="font-semibold">{count}</dd></div>
            ))}
          </dl>
          <a href="/api/admin/backup" download className="inline-block text-sm text-sky-300 underline">Download current backup</a>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={savedCurrent} onChange={(event) => setSavedCurrent(event.target.checked)} />
            I saved a copy of the current backup
          </label>
          <label className="grid gap-1 text-sm">Type {phrase} to confirm
            <input autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3" />
          </label>
          <button type="button" disabled={busy || !savedCurrent || confirmation !== phrase} onClick={() => submit(true)}
            className="min-h-11 rounded-lg bg-rose-100 px-4 font-semibold text-rose-950 disabled:opacity-50">Replace family data</button>
        </div>
      )}
      <output className="block text-sm text-slate-300">{message}</output>
    </section>
  );
}
