"use client";

import { useEffect, useState } from "react";
import type { ChildProfile, RewardItem } from "@/features/admin/types";

export function ShopMonthPlanner({ profiles, rewards }: { profiles: ChildProfile[]; rewards: RewardItem[] }) {
  const [selection, setSelection] = useState("");
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const childId = profiles.some((child) => child.id === selection) ? selection : profiles[0]?.id;
  const [year, month] = period.split("-").map(Number);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="grid gap-1 text-sm">Child
          <select value={childId ?? ""} onChange={(event) => setSelection(event.target.value)} className="min-h-11 rounded-lg bg-slate-900 px-3">
            {profiles.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Month
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="min-h-11 rounded-lg bg-slate-900 px-3" />
        </label>
      </div>
      {childId && month ? <MonthPlan key={childId + period} childId={childId} year={year} month={month} rewards={rewards} /> : (
        <p className="text-sm text-slate-300">Choose a child and month to start planning.</p>
      )}
    </section>
  );
}

function MonthPlan({ childId, year, month, rewards }: { childId: string; year: number; month: number; rewards: RewardItem[] }) {
  const [saved, setSaved] = useState<string[] | null>();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const candidates = rewards.filter((reward) => !reward.isGroup && (reward.targetMonth === null || reward.targetMonth === month));
  const included = draft ?? [];
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long" });

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ childId, year: String(year), month: String(month) });
    fetch("/api/parent/shop-plans?" + query, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const { rewardIds } = await response.json();
        setDraft(rewardIds);
        setSaved(rewardIds);
      }).catch(() => {
        if (!controller.signal.aborted) setMessage("Could not load this plan. Reopen the month to retry.");
      });
    return () => controller.abort();
  }, [childId, year, month]);

  function add(id: string) {
    if (!saving && candidates.some((reward) => reward.id === id) && !included.includes(id)) setDraft([...included, id]);
  }

  async function save(rewardIds: string[] | null) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/parent/shop-plans", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, year, month, rewardIds }),
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setDraft(result.rewardIds);
      setSaved(result.rewardIds);
      setMessage("Plan saved.");
    } catch {
      setMessage("Could not save the plan. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (saved === undefined) return <output>{message || "Loading shop plan…"}</output>;

  return (
    <div className="space-y-4">
      {saved === null && <p className="text-sm text-slate-300">Default shop availability is active until you save a plan for this month.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-xl border border-slate-800 p-4">
          <h3 className="font-semibold">All Shop Items</h3>
          {candidates.filter((reward) => !included.includes(reward.id)).map((reward) => (
            <button key={reward.id} type="button" disabled={saving} draggable={!saving}
              onDragStart={(event) => event.dataTransfer.setData("application/x-family-prize", reward.id)}
              onClick={() => add(reward.id)}
              className="flex min-h-11 w-full justify-between rounded-lg bg-slate-900 p-3 text-left text-sm">
              <span>{reward.title} · {reward.starCost} stars</span><span>Add to month</span>
            </button>
          ))}
        </section>
        <section className="space-y-2 rounded-xl border border-slate-700 p-4"
          onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-family-prize")) event.preventDefault(); }}
          onDrop={(event) => { event.preventDefault(); add(event.dataTransfer.getData("application/x-family-prize")); }}>
          <h3 className="font-semibold">Available in {monthName}</h3>
          {candidates.filter((reward) => included.includes(reward.id)).map((reward) => (
            <div key={reward.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3 text-sm">
              <span>{reward.title}{!reward.isVisible ? " · Hidden" : ""}</span>
              <button type="button" disabled={saving} className="min-h-11 rounded-md border border-slate-700 px-2"
                aria-label={`Remove ${reward.title} from month`}
                onClick={() => setDraft(included.filter((id) => id !== reward.id))}>Remove</button>
            </div>
          ))}
          {included.length === 0 && <p className="text-sm text-slate-400">Drop prizes here to add them.</p>}
        </section>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving || (saved !== null && draft === saved)} onClick={() => save(included)}
          className="min-h-11 rounded-lg bg-slate-100 px-4 font-semibold text-slate-900 disabled:opacity-50">Save month</button>
        {saved !== null && <button type="button" disabled={saving} onClick={() => save(null)}
          className="min-h-11 rounded-lg border border-slate-700 px-4">Use default availability</button>}
        <output className="text-sm">{message}</output>
      </div>
    </div>
  );
}
