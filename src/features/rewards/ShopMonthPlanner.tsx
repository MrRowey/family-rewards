"use client";

import { Fragment, useEffect, useState } from "react";
import { calculateAgeProfile } from "@/lib/ageRules";
import type { ChildProfile, RewardItem } from "@/features/admin/types";

export function ShopMonthPlanner({ profiles, rewards }: { profiles: ChildProfile[]; rewards: RewardItem[] }) {
  const [selection, setSelection] = useState("");
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const childId = profiles.some((child) => child.id === selection) ? selection : profiles[0]?.id;
  const profile = profiles.find((child) => child.id === childId);
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
      {profile && month ? <MonthPlan key={childId + period} profile={profile} year={year} month={month} rewards={rewards} /> : (
        <p className="text-sm text-slate-300">Choose a child and month to start planning.</p>
      )}
    </section>
  );
}

function MonthPlan({ profile, year, month, rewards }: { profile: ChildProfile; year: number; month: number; rewards: RewardItem[] }) {
  const childId = profile.id;
  const [saved, setSaved] = useState<string[] | null>();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const candidates = rewards.filter((reward) => !reward.isGroup && !reward.isArchived && (reward.targetMonth === null || reward.targetMonth === month));
  const included = draft ?? [];
  const costs = [...new Set(candidates.map((reward) => reward.starCost))].toSorted((a, b) => a - b);
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

  const defaultItems = candidates.filter((reward) => reward.isVisible && (!reward.assignments?.length || reward.assignments.some((entry) => entry.childId === childId)));
  const previewItems = draft === null ? defaultItems : candidates.filter((reward) => included.includes(reward.id));
  const previewAge = calculateAgeProfile(new Date(profile.dob), new Date(year, month - 1, 1)).ageYears;

  return (
    <div className="space-y-4">
      {saved === null && <p className="text-sm text-slate-300">Default shop availability is active until you save a plan for this month.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2 rounded-xl border border-slate-800 p-4">
          <h3 className="font-semibold">All Shop Items</h3>
          {costs.map((cost) => {
            const entries = candidates.filter((reward) => reward.starCost === cost && !included.includes(reward.id));
            if (!entries.length) return null;
            return (
              <Fragment key={cost}>
                <h4 className="pt-2 text-sm font-semibold text-amber-200">{cost} {cost === 1 ? "star" : "stars"}</h4>
                {entries.map((reward) => (
            <button key={reward.id} type="button" disabled={saving} draggable={!saving}
              onDragStart={(event) => event.dataTransfer.setData("application/x-family-prize", reward.id)}
              onClick={() => add(reward.id)}
              className="flex min-h-11 w-full justify-between rounded-lg bg-slate-900 p-3 text-left text-sm">
              <span>{reward.title}</span><span>Add to month</span>
            </button>
                ))}
              </Fragment>
            );
          })}
        </section>
        <section className="space-y-2 rounded-xl border border-slate-700 p-4"
          onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-family-prize")) event.preventDefault(); }}
          onDrop={(event) => { event.preventDefault(); add(event.dataTransfer.getData("application/x-family-prize")); }}>
          <h3 className="font-semibold">Available in {monthName}</h3>
          {costs.map((cost) => {
            const entries = candidates.filter((reward) => reward.starCost === cost && included.includes(reward.id));
            if (!entries.length) return null;
            return (
              <Fragment key={cost}>
                <h4 className="pt-2 text-sm font-semibold text-amber-200">{cost} {cost === 1 ? "star" : "stars"}</h4>
                {entries.map((reward) => (
            <div key={reward.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3 text-sm">
              <span>{reward.title}</span>
              <button type="button" disabled={saving} className="min-h-11 rounded-md border border-slate-700 px-2"
                aria-label={`Remove ${reward.title} from month`}
                onClick={() => setDraft(included.filter((id) => id !== reward.id))}>Remove</button>
            </div>
                ))}
              </Fragment>
            );
          })}
          {included.length === 0 && <p className="text-sm text-slate-400">Drop prizes here to add them.</p>}
        </section>
      </div>
      <details className="rounded-xl border border-slate-800 p-4">
        <summary className="cursor-pointer font-semibold">Preview as {profile.name}</summary>
        <p className="mt-2 text-sm text-slate-400">Uses the current draft and stock, with age checked on the first day of {monthName}.</p>
        {previewItems.length === 0 && <p className="mt-2 text-sm">No prizes in this plan.</p>}
        <ul className="mt-2 divide-y divide-slate-800 text-sm">
          {previewItems.map((reward) => {
            const ageEligible = previewAge >= (reward.minAge ?? 2) && previewAge <= (reward.maxAge ?? 18);
            const availability = !ageEligible ? "Outside age range" : reward.currentStock <= 0 ? "Out of stock" : "Available";
            return <li key={reward.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{reward.title} · {reward.starCost} stars</span><span className="text-slate-300">{availability}</span>
            </li>;
          })}
        </ul>
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving || (saved !== null && draft === saved)} onClick={() => save(included.filter((id) => candidates.some((reward) => reward.id === id)))}
          className="min-h-11 rounded-lg bg-slate-100 px-4 font-semibold text-slate-900 disabled:opacity-50">Save month</button>
        {saved !== null && <button type="button" disabled={saving} onClick={() => save(null)}
          className="min-h-11 rounded-lg border border-slate-700 px-4">Use default availability</button>}
        <output className="text-sm">{message}</output>
      </div>
    </div>
  );
}
