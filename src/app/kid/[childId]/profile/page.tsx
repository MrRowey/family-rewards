"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Award, Pencil, ShoppingBag, Star, Trophy, ChevronRight } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
import { CompactXpProgress, type XpSnapshot, type ProgressionRules } from "@/components/kiosk/CompactXpProgress";
import { avatarCurrencyName } from "@/lib/avatar-currency-names";
import { useKioskSettings } from "@/hooks/useKioskSettings";

type Badge = {
  key: string; title: string; icon: string; description: string;
  unlocked: boolean; current: number; threshold: number;
};
type ChildInfo = {
  id: string; name: string; avatar: string; avatarTheme?: string | null;
  avatarConfig?: string | null; stars: number;
};
type ProgressData = {
  progress: XpSnapshot;
  avatarCoins: number;
  rules: ProgressionRules;
  achievements: Badge[];
};
type Celebration = {
  achievements: { id: string; title: string; icon: string }[];
  rewardPerBadge: number;
};

export default function ChildProfilePage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = use(params);
  const router = useRouter();
  const { config } = useKioskSettings(true);
  const [child, setChild] = useState<ChildInfo | null>(null);
  const [data, setData] = useState<ProgressData | null>(null);
  const [notice, setNotice] = useState<Celebration | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [childrenRes, progressRes] = await Promise.all([
          fetch("/api/children", { cache: "no-store" }),
          fetch(`/api/children/${encodeURIComponent(childId)}/progress`, { cache: "no-store" }),
        ]);
        if (!childrenRes.ok || !progressRes.ok) throw new Error("Could not open this profile.");
        const children = await childrenRes.json() as ChildInfo[];
        const nextChild = children.find(item => item.id === childId);
        if (!nextChild) throw new Error("This child profile was not found.");
        const nextProgress = await progressRes.json() as ProgressData;
        if (!active) return;
        setChild(nextChild);
        setData(nextProgress);
        // Claim notifications only on a deliberate profile entry, never during approval.
        const claimed = await fetch("/api/kiosk/achievements/celebrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId }),
        });
        if (claimed.ok) {
          const result = await claimed.json() as Celebration;
          if (active && result.achievements.length > 0) setNotice(result);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load this profile.");
      }
    })();
    return () => { active = false; };
  }, [childId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const path = encodeURIComponent(childId);
  const earned = data?.achievements.filter(item => item.unlocked) ?? [];
  const nextBadges = data?.achievements.filter(item => !item.unlocked).slice(0, 3) ?? [];
  const currency = avatarCurrencyName(child?.avatarTheme, data?.avatarCoins ?? 0);

  return <main data-reduced-motion={config.reducedMotion} data-large-kiosk-text={config.largeKioskText}
    className="min-h-screen select-none bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-5 text-white sm:px-8 sm:py-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => router.push(`/kid/${path}`)}
          aria-label="Back to chores"
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-white/10 bg-slate-800 focus-visible:outline-2 focus-visible:outline-indigo-400">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-black sm:text-3xl">{child ? `${child.name}'s Profile` : "My Profile"}</h1>
          <p className="text-sm text-slate-400">Your avatar, levels and achievements</p>
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-950/50 p-5">
        <p>{error}</p>
        <button type="button" onClick={() => router.push("/")} className="mt-3 min-h-12 rounded-xl bg-indigo-600 px-5 font-bold">Family Hub</button>
      </div>}
      {!child && !error && <output className="block rounded-xl bg-slate-900 p-6">Opening your profile…</output>}

      {child && data && <>
        <div className="grid gap-4 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
          <section aria-label="My avatar" className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-center">
            <div className="flex h-52 w-52 items-center justify-center rounded-3xl bg-slate-950/90 p-4 ring-2 ring-indigo-400/30 sm:h-60 sm:w-60">
              {child.avatarConfig ? <AvatarDisplay theme={child.avatarTheme} config={child.avatarConfig} seed={child.id} fallbackEmoji={child.avatar} size={184} /> :
                child.avatar.startsWith("/") ? <Image src={child.avatar} alt="Your avatar" width={184} height={184} unoptimized className="h-44 w-44 rounded-2xl object-contain"/> :
                <span aria-label="Your current avatar" className="text-7xl">{child.avatar || "🦁"}</span>}
            </div>
            <p className="text-lg font-black">{child.name}&apos;s Avatar</p>
            <button type="button" onClick={() => router.push(`/child/${path}/avatar`)}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 font-black hover:bg-indigo-500">
              <Pencil size={20} aria-hidden="true" /> {child.avatarConfig ? "Edit Avatar" : "Create My Avatar"}
            </button>
          </section>

          <section aria-label="My level and rewards" className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
            <div>
              <h2 className="mb-3 text-xl font-black">✨ My Progress</h2>
              <CompactXpProgress progress={data.progress} avatarCoins={data.avatarCoins}
                theme={child.avatarTheme} rules={data.rules} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <span className="flex items-center gap-2 text-sm font-bold text-amber-200"><Star size={18}/> Stars</span>
                <strong className="mt-2 block text-2xl text-amber-300">{child.stars}</strong>
              </div>
              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                <span className="flex items-center gap-2 text-sm font-bold text-indigo-200"><Trophy size={18}/> Badges</span>
                <strong className="mt-2 block text-2xl text-indigo-100">{earned.length} / {data.achievements.length}</strong>
              </div>
            </div>
            <button type="button" onClick={() => router.push(`/shop?childId=${path}`)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-indigo-400/40 bg-slate-800 px-4 font-bold">
              <ShoppingBag size={20} aria-hidden="true"/> Visit Reward Shop
            </button>
          </section>
        </div>

        <section aria-label="My achievements" className="rounded-3xl border border-amber-400/20 bg-slate-900/80 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">🏆 My Achievements</h2>
              <p className="text-sm text-slate-400">{earned.length} unlocked · Earn more badges and {currency}!</p>
            </div>
            <button type="button" onClick={() => router.push(`/kid/${path}/achievements`)}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold">
              All Achievements <ChevronRight size={18} aria-hidden="true"/>
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earned.slice(-3).toReversed().map(item =>
              <article key={item.key} className="flex min-h-20 items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                <span aria-hidden="true" className="text-4xl">{item.icon}</span>
                <div><h3 className="font-black">{item.title}</h3><p className="text-xs text-amber-200">Unlocked</p></div>
              </article>)}
            {earned.length === 0 && <div className="col-span-full rounded-2xl bg-slate-800 p-5 text-center text-slate-300">
              <Award className="mx-auto mb-2 text-amber-300" aria-hidden="true"/> Your first badge is waiting. Try a chore!
            </div>}
          </div>
          {nextBadges.length > 0 && <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm font-bold text-slate-400">Up next:</span>
            {nextBadges.map(item => <span key={item.key} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">{item.icon} {item.title} ({item.current}/{item.threshold})</span>)}
          </div>}
        </section>
      </>}
    </div>

    {notice && <output aria-live="polite"
      className={`pointer-events-none fixed right-4 top-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-amber-400/50 bg-slate-900 p-4 shadow-2xl ${config.reducedMotion ? "" : "animate-in fade-in slide-in-from-top-4"}`}>
      <div className="flex items-center gap-3"><span aria-hidden="true" className="text-3xl">🎉</span>
        <div><strong className="text-lg text-amber-200">Achievement Unlocked!</strong>
          <p className="mt-1 text-sm text-slate-100">
            {notice.achievements.length === 1
              ? `${notice.achievements[0].icon} ${notice.achievements[0].title}`
              : `${notice.achievements.length} new badges: ${notice.achievements.map(item => item.title).join(", ")}`}
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-300">+{notice.achievements.length * notice.rewardPerBadge} {avatarCurrencyName(child?.avatarTheme, notice.achievements.length * notice.rewardPerBadge)} in achievement rewards</p>
        </div>
      </div>
    </output>}
  </main>;
}
