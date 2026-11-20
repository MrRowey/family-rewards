"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { useKioskSettings } from "@/hooks/useKioskSettings";

type Rule = "TOTAL_TASKS" | "STARS_EARNED" | "REWARDS_REDEEMED" | "STREAK_DAYS";
type Achievement = { key: string; title: string; icon: string; description: string; ruleType: Rule; threshold: number; current: number; unlocked: boolean };
type Data = { progress: { level: number; current: number; required: number; percent: number }; avatarCoins: number; achievements: Achievement[] };
const tabs: { key: "ALL" | Rule; label: string; icon: string }[] = [
  { key: "ALL", label: "All", icon: "🏆" },
  { key: "TOTAL_TASKS", label: "Chores", icon: "🧹" },
  { key: "STARS_EARNED", label: "Stars", icon: "⭐" },
  { key: "REWARDS_REDEEMED", label: "Rewards", icon: "🎁" },
  { key: "STREAK_DAYS", label: "Streaks", icon: "🔥" },
];
const units: Record<Rule, string> = { TOTAL_TASKS: "chores", STARS_EARNED: "Stars", REWARDS_REDEEMED: "rewards", STREAK_DAYS: "days" };

export default function AchievementsPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = use(params);
  const router = useRouter();
  const { config } = useKioskSettings(true);
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"ALL" | Rule>("ALL");
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState<Achievement | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/children/${encodeURIComponent(childId)}/progress`, { cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Could not load achievements"); return response.json() as Promise<Data>; })
      .then(result => {
        if (!active) return;
        setData(result);
        // Celebrate a newly unlocked badge only once per browser session.
        const key = `family-rewards-achievements-seen-${childId}`;
        const seen = new Set<string>(JSON.parse(sessionStorage.getItem(key) || "[]") as string[]);
        const newlyUnlocked = result.achievements.filter(item => item.unlocked && !seen.has(item.key));
        sessionStorage.setItem(key, JSON.stringify(result.achievements.filter(item => item.unlocked).map(item => item.key)));
        if (newlyUnlocked.length) setCelebrate(newlyUnlocked[0]);
      })
      .catch(() => { if (active) setError("Could not load achievements. Please try again."); });
    return () => { active = false; };
  }, [childId]);

  useEffect(() => {
    if (!celebrate || config.reducedMotion) return;
    void confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 }, disableForReducedMotion: true });
  }, [celebrate, config.reducedMotion]);

  const visible = useMemo(() => (data?.achievements || []).filter(item => tab === "ALL" || item.ruleType === tab), [data, tab]);
  const unlocked = data?.achievements.filter(item => item.unlocked).length ?? 0;
  return <main className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-white sm:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => router.push(`/kid/${encodeURIComponent(childId)}`)} aria-label="Back to dashboard" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800"><ArrowLeft/></button>
        <div className="flex-1"><h1 className="text-3xl font-black sm:text-4xl">🏆 My Achievements</h1><p className="text-slate-300">Collect badges and earn Avatar Coins!</p></div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-black text-amber-300">🪙 {data?.avatarCoins ?? "—"} Coins</div>
      </header>
      {error && <p role="alert" className="rounded-xl bg-rose-950 p-4">{error}</p>}
      {!data && !error && <p role="status">Loading your achievements…</p>}
      {data && <>
        <section className="rounded-3xl border border-indigo-400/20 bg-slate-900 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black">Level {data.progress.level}</h2><span className="text-sm text-indigo-200">{data.progress.current} / {data.progress.required} XP</span></div>
          <div role="progressbar" aria-label="XP to next level" aria-valuemin={0} aria-valuemax={data.progress.required} aria-valuenow={data.progress.current} className="h-4 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${data.progress.percent}%` }}/></div>
          <p className="mt-3 text-sm text-slate-300">{unlocked} of {data.achievements.length} achievements unlocked · +5 Avatar Coins for each new badge</p>
        </section>
        <nav aria-label="Achievement categories" className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => setTab(item.key)} className={`min-h-12 shrink-0 rounded-xl border px-4 font-bold ${tab === item.key ? "border-indigo-300 bg-indigo-600" : "border-slate-700 bg-slate-800"}`}>{item.icon} {item.label}</button>)}
        </nav>
        <section aria-label="Achievement badges" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(item => <article key={item.key} className={`rounded-3xl border p-5 ${item.unlocked ? "border-amber-400/40 bg-amber-400/10" : "border-slate-700 bg-slate-900"}`}>
            <div className="mb-3 flex items-start justify-between"><span className={`text-5xl ${item.unlocked ? "" : "grayscale opacity-50"}`}>{item.icon}</span>{item.unlocked ? <span className="rounded-full bg-emerald-900 px-3 py-1 text-xs font-bold text-emerald-200">Unlocked</span> : <Lock className="text-slate-400"/>}</div>
            <h2 className="text-lg font-black">{item.title}</h2><p className="mt-1 min-h-10 text-sm text-slate-300">{item.description}</p>
            <div className="mt-4 flex justify-between text-sm"><span>{item.current} / {item.threshold} {units[item.ruleType]}</span><span className="font-bold text-amber-300">+5 🪙</span></div>
            <div role="progressbar" aria-label={`${item.title} progress`} aria-valuemin={0} aria-valuemax={item.threshold} aria-valuenow={item.current} className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700"><div className={`h-full rounded-full ${item.unlocked ? "bg-amber-400" : "bg-indigo-400"}`} style={{ width: `${Math.min(100, item.current / item.threshold * 100)}%` }}/></div>
          </article>)}
        </section>
      </>}
    </div>
    {celebrate && <div role="dialog" aria-modal="true" aria-label="Achievement unlocked" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"><div className="w-full max-w-sm rounded-3xl border border-amber-400/50 bg-slate-900 p-7 text-center shadow-2xl"><Trophy className="mx-auto mb-3 h-10 w-10 text-amber-300"/><div className="text-6xl">{celebrate.icon}</div><h2 className="mt-4 text-2xl font-black">Achievement Unlocked!</h2><p className="mt-2 text-xl font-bold">{celebrate.title}</p><p className="mt-2 text-amber-300">+5 Avatar Coins earned</p><button type="button" onClick={() => setCelebrate(null)} className="mt-6 min-h-14 w-full rounded-2xl bg-indigo-600 font-black">Awesome!</button></div></div>}
  </main>;
}
