"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { CompactXpProgress, type ProgressionRules } from "@/components/kiosk/CompactXpProgress";
import { avatarCurrencyName } from "@/lib/avatar-currency-names";
import { useKioskSettings } from "@/hooks/useKioskSettings";

type Rule = "TOTAL_TASKS" | "STARS_EARNED" | "REWARDS_REDEEMED" | "STREAK_DAYS";
type Achievement = { key: string; title: string; icon: string; description: string; ruleType: Rule; threshold: number; current: number; unlocked: boolean };
type Data = { progress: { level: number; current: number; required: number; percent: number }; avatarCoins: number; avatarTheme: string | null; rules: ProgressionRules; achievements: Achievement[] };
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
  useKioskSettings(true);
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"ALL" | Rule>("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/children/${encodeURIComponent(childId)}/progress`, { cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Could not load achievements"); return response.json() as Promise<Data>; })
      .then(result => { if (active) setData(result); })
      .catch(() => { if (active) setError("Could not load achievements. Please try again."); });
    return () => { active = false; };
  }, [childId]);

  const visible = useMemo(() => (data?.achievements || []).filter(item => tab === "ALL" || item.ruleType === tab), [data, tab]);
  const unlocked = data?.achievements.filter(item => item.unlocked).length ?? 0;
  return <main className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6 text-white sm:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => router.push(`/kid/${encodeURIComponent(childId)}/profile`)} aria-label="Back to dashboard" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800"><ArrowLeft/></button>
        <div className="flex-1"><h1 className="text-3xl font-black sm:text-4xl">🏆 My Achievements</h1><p className="text-slate-300">Collect badges and earn themed rewards!</p></div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-black text-amber-300">🪙 {data?.avatarCoins ?? "—"} {avatarCurrencyName(data?.avatarTheme, data?.avatarCoins ?? 0)}</div>
      </header>
      {error && <p role="alert" className="rounded-xl bg-rose-950 p-4">{error}</p>}
      {!data && !error && <output>Loading your achievements…</output>}
      {data && <>
        <CompactXpProgress progress={data.progress} avatarCoins={data.avatarCoins} theme={data.avatarTheme} rules={data.rules} />
        <p className="text-sm text-slate-300">{unlocked} of {data.achievements.length} achievements unlocked · +{data.rules.coinsPerAchievement} {avatarCurrencyName(data.avatarTheme, data.rules.coinsPerAchievement)} for each new badge</p>
        <nav aria-label="Achievement categories" className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => setTab(item.key)} className={`min-h-12 shrink-0 rounded-xl border px-4 font-bold ${tab === item.key ? "border-indigo-300 bg-indigo-600" : "border-slate-700 bg-slate-800"}`}>{item.icon} {item.label}</button>)}
        </nav>
        <section aria-label="Achievement badges" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(item => <article key={item.key} className={`rounded-3xl border p-5 ${item.unlocked ? "border-amber-400/40 bg-amber-400/10" : "border-slate-700 bg-slate-900"}`}>
            <div className="mb-3 flex items-start justify-between"><span className={`text-5xl ${item.unlocked ? "" : "grayscale opacity-50"}`}>{item.icon}</span>{item.unlocked ? <span className="rounded-full bg-emerald-900 px-3 py-1 text-xs font-bold text-emerald-200">Unlocked</span> : <Lock className="text-slate-400"/>}</div>
            <h2 className="text-lg font-black">{item.title}</h2><p className="mt-1 min-h-10 text-sm text-slate-300">{item.description}</p>
            <div className="mt-4 flex justify-between text-sm"><span>{item.current} / {item.threshold} {units[item.ruleType]}</span><span className="font-bold text-amber-300">+{data.rules.coinsPerAchievement} 🪙</span></div>
            <progress aria-label={`${item.title} progress`} max={item.threshold} value={Math.min(item.current, item.threshold)} className={`mt-2 block h-3 w-full overflow-hidden rounded-full bg-slate-700 [&::-webkit-progress-bar]:bg-slate-700 ${item.unlocked ? "accent-amber-400 [&::-webkit-progress-value]:bg-amber-400 [&::-moz-progress-bar]:bg-amber-400" : "accent-indigo-400 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400"}`}/>
          </article>)}
        </section>
      </>}
    </div>
  </main>;
}
