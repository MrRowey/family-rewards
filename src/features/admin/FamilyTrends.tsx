"use client";

import { useEffect, useState } from "react";
import type { ChildProfile } from "./types";

interface TrendRow {
  date: string;
  chores: number;
  prizes: number;
  starsSpent: number;
  missingPrices: number;
}

const metrics = [
  { key: "chores", label: "Approved chores", color: "bg-sky-400" },
  { key: "prizes", label: "Approved prize claims", color: "bg-emerald-400" },
  { key: "starsSpent", label: "Stars spent on approved prizes", color: "bg-amber-400" },
] as const;

export function FamilyTrends({ profiles }: { profiles: ChildProfile[] }) {
  const [childId, setChildId] = useState("");
  const [days, setDays] = useState("30");

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Activity over time</h3>
      <div className="flex flex-wrap gap-4">
        <label className="grid gap-1 text-sm">Child
          <select className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3"
            value={childId} onChange={(event) => setChildId(event.target.value)}>
            <option value="">All children</option>
            {profiles.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Date range
          <select className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3"
            value={days} onChange={(event) => setDays(event.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      <TrendResults key={childId + ":" + days} childId={childId} days={days} />
    </section>
  );
}

function TrendResults({ childId, days }: { childId: string; days: string }) {
  const [rows, setRows] = useState<TrendRow[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ childId, days });
    fetch("/api/parent/family-stats?" + query, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setRows(await response.json());
      }).catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [childId, days]);

  if (failed) return <p role="alert">Could not load activity for this range.</p>;
  if (!rows) return <output>Loading activity…</output>;
  const missingPrices = rows.reduce((total, row) => total + row.missingPrices, 0);

  return (
    <>
      <p className="text-sm text-slate-300">Chores use the scheduled date. Prize claims use the request date. Dates are shown in UTC.</p>
      <div className="grid gap-4 xl:grid-cols-3">
        {metrics.map(({ key, label, color }) => {
          const values = rows.map((row) => row[key]);
          const max = Math.max(1, ...values);
          return (
            <figure key={key} className="min-w-0 space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <figcaption className="font-semibold">{label} <span className="text-slate-300">· {values.reduce((sum, value) => sum + value, 0)}</span></figcaption>
              <div aria-hidden="true" className="flex h-24 items-end gap-px border-b border-slate-700">
                {rows.map((row) => <div key={row.date} title={row.date + ": " + row[key]}
                  className={color + " min-w-0 flex-1 rounded-t-sm"} style={{ height: (row[key] / max) * 100 + "%" }} />)}
              </div>
              <div className="flex justify-between text-xs text-slate-400"><span>{rows[0]?.date}</span><span>{rows.at(-1)?.date}</span></div>
            </figure>
          );
        })}
      </div>
      {missingPrices > 0 && <p className="text-sm text-slate-300">{missingPrices} older claims have no recorded price and are excluded from the stars total.</p>}
      <details className="rounded-xl border border-slate-800 p-4">
        <summary className="cursor-pointer font-semibold">Daily figures</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr><th scope="col">Date</th>{metrics.map(({ key, label }) => <th scope="col" key={key} className="p-2">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-800">
              {rows.toReversed().map((row) => <tr key={row.date}><th scope="row" className="whitespace-nowrap py-2 font-medium">{row.date}</th>
                {metrics.map(({ key }) => <td key={key} className="p-2">{row[key]}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
