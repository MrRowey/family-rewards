"use client";

import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useState, useEffect, useRef, use } from "react";
import AvatarDisplay from "@/components/AvatarDisplay";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Star, ListCheck, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { sounds } from "@/lib/sound";

interface SubStep {
  id: string;
  title: string;
}

interface Task {
  id: string;
  title: string;
  icon: string;
  imageUrl?: string;
  starValue: number;
  subSteps?: SubStep[];
}

interface Achievement { key: string; title: string; icon: string; description: string; threshold: number; current: number; unlocked: boolean; }

interface Child {
  id: string;
  name: string;
  avatar: string;
  avatarTheme?: string | null;
  avatarConfig?: string | null;
  stars: number;
  avatarCoins: number;
  progress: { level: number; current: number; required: number; percent: number };
}

export default function KidKioskPage({ params }: { params: Promise<{ childId: string }> }) {
  const { config: kioskConfig } = useKioskSettings(true);
  const resolvedParams = use(params);
  const { childId } = resolvedParams;
  const router = useRouter();

  const [child, setChild] = useState<Child | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [checkedSubsteps, setCheckedSubsteps] = useState<Record<string, boolean>>({});
  const submission = useRef(false);
  const completionVersion = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let version = 0;
    async function loadData() {
      if (document.hidden) return;
      const latestRequest = ++version;
      const completionAtStart = completionVersion.current;
      try {
        const [childRes, taskRes, compRes] = await Promise.all([
          fetch("/api/children", { cache: "no-store" }),
          fetch(`/api/task-assignments?childId=${childId}&day=today`, { cache: "no-store" }),
          fetch(`/api/task-completions?childId=${childId}&date=today`, { cache: "no-store" }),
        ]);

        if (!childRes.ok || !taskRes.ok || !compRes.ok) throw new Error("Could not refresh chores.");
        const [children, assignments, completions]: [
          Child[], { task: Task }[], { status: string; taskId: string }[],
        ] = await Promise.all([childRes.json(), taskRes.json(), compRes.json()]);
        if (latestRequest !== version || completionAtStart !== completionVersion.current) return;

        const pending = new Set(completions.filter((item) => item.status === "PENDING").map((item) => item.taskId));
        const approved = new Set(completions.filter((item) => item.status === "APPROVED").map((item) => item.taskId));
        const scheduled = new Map(assignments.map(({ task }) => [task.id, task]));
        setChild(children.find((item) => item.id === childId) ?? null);
        void fetch(`/api/children/${encodeURIComponent(childId)}/progress`, { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => { if (data?.achievements && latestRequest === version) setAchievements(data.achievements); }).catch(() => {});
        setPendingCount(pending.size);
        setTasks([...scheduled.values()].filter((task) => !pending.has(task.id) && !approved.has(task.id)));
        setSyncError(false);
      } catch (err) {
        if (latestRequest === version) setSyncError(true);
        console.error("Failed to load kiosk data", err);
      } finally {
        if (latestRequest === version) setLoading(false);
      }
    }

    void loadData();
    const timer = window.setInterval(loadData, 10000);
    window.addEventListener("focus", loadData);
    document.addEventListener("visibilitychange", loadData);
    return () => {
      version++;
      window.clearInterval(timer);
      window.removeEventListener("focus", loadData);
      document.removeEventListener("visibilitychange", loadData);
    };
  }, [childId]);

  const toggleSubstep = (substepId: string) => {
    if (kioskConfig.soundEffects) sounds.playPop();
    setCheckedSubsteps((prev) => ({ ...prev, [substepId]: !prev[substepId] }));
  };

  const handleCompleteChore = async (taskId: string) => {
    if (submission.current) return;
    submission.current = true;
    setSubmitting(true);
    setCompletionMessage("");
    try {
      const res = await fetch("/api/task-completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, taskId }),
      });

      if (!res.ok) throw new Error("Could not submit chore.");
      if (res.ok) {
        completionVersion.current++;
        setCompletionMessage("Chore sent for approval.");
        if (kioskConfig.soundEffects) sounds.playSuccessChime();
        if (!kioskConfig.reducedMotion) confetti({
          disableForReducedMotion: true,
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch {
      setCompletionMessage("Could not submit this chore. Try again.");
    } finally {
      submission.current = false;
      setSubmitting(false);
    }
  };

  if (loading || !child) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-slate-400">{syncError ? "Could not load chores. Trying again…" : !loading ? "Child profile unavailable" : "Opening Dashboard…"}</p>
      </div>
    );
  }

  return (
    <main data-large-kiosk-text={kioskConfig.largeKioskText} data-reduced-motion={kioskConfig.reducedMotion} className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 px-4 py-5 sm:px-8 sm:py-8 select-none touch-manipulation">
      <header className="mx-auto mb-6 grid max-w-6xl gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-4 sm:p-6 landscape:lg:flex landscape:lg:items-center landscape:lg:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <button
            onClick={() => router.push("/")}
            className="shrink-0 p-3 min-h-14 min-w-14 sm:min-h-16 sm:min-w-16 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-2xl transition flex items-center justify-center border border-slate-700/50 shadow-lg"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-7 h-7 text-slate-200" />
          </button>

          <button type="button" onClick={() => router.push(`/child/${encodeURIComponent(childId)}/avatar`)} aria-label="Customise avatar" className="relative shrink-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-indigo-400">
            {child.avatarConfig ? (
              <AvatarDisplay theme={child.avatarTheme} config={child.avatarConfig} seed={child.id} fallbackEmoji={child.avatar} size={64} />
            ) : child.avatar.startsWith("/") ? (
              <Image
                src={child.avatar}
                alt={child.name}
                width={64}
                height={64}
                unoptimized
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-xl"
              />
            ) : (
              <span className="text-4xl sm:text-6xl filter drop-shadow-md">{child.avatar}</span>
            )}
          </button>

          <div>
            <h1 className="wrap-break-word text-2xl font-black tracking-tight sm:text-4xl">{child.name}&apos;s Dashboard</h1>
            <p className="text-sm text-slate-400 font-medium">Complete daily chores to earn shiny stars!</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-inner">
            <Star className="w-8 h-8 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="text-3xl font-black text-amber-400">{child.stars}</span>
          </div>
          <button
            onClick={() => router.push("/shop?childId=" + encodeURIComponent(childId))}
            className="min-h-14 flex-1 justify-center whitespace-nowrap bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-black px-6 py-4 rounded-2xl transition flex items-center gap-3 shadow-lg active:scale-95"
          >
            <ShoppingBag className="w-6 h-6" /> Reward Shop
          </button>
        </div>
      </header>

      <section aria-label="Avatar level progress" className="max-w-6xl mx-auto mb-6 rounded-3xl border border-indigo-500/20 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div><p className="text-lg font-black text-indigo-200">⭐ Level {child.progress?.level ?? 1}</p><p className="text-xs text-slate-400">Keep completing chores to level up!</p></div>
          <div className="text-right"><p className="font-bold text-amber-300">🪙 {child.avatarCoins ?? 0} Avatar Coins</p><p className="text-sm text-slate-400">{child.progress?.current ?? 0} / {child.progress?.required ?? 100} XP</p></div>
        </div>
        <div role="progressbar" aria-label="XP to next level" aria-valuenow={child.progress?.current ?? 0} aria-valuemin={0} aria-valuemax={child.progress?.required ?? 100} className="h-4 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-400 transition-[width] duration-500" style={{ width: `${child.progress?.percent ?? 0}%` }}/>
        </div>
        <p className="mt-2 text-xs text-slate-400">+20 XP and +1 Avatar Coin per approved chore · +5 coins per level · +5 coins per achievement</p>
      </section>
      <section aria-label="Achievements" className="max-w-6xl mx-auto mb-6">
        <h2 className="mb-3 text-xl font-black">🏆 Achievements</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {achievements.map(item => <div key={item.key} className={`rounded-2xl border p-3 text-center ${item.unlocked ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-slate-900/60"}`}>
            <div className={`text-3xl ${item.unlocked ? "" : "grayscale opacity-50"}`}>{item.icon}</div>
            <p className="mt-1 text-sm font-bold">{item.title}</p>
            <p className="text-xs text-slate-400">{item.current}/{item.threshold} chores</p>
            <p className="mt-1 text-xs font-semibold text-amber-300">{item.unlocked ? "Unlocked!" : "+5 🪙 to unlock"}</p>
          </div>)}
        </div>
      </section>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <ListCheck className="w-8 h-8 text-indigo-400" /> Today&apos;s Chores
          </h2>
          <span className="text-sm font-semibold bg-indigo-950 text-indigo-300 px-4 py-1.5 rounded-full border border-indigo-800/50">
            {tasks.length} Left
          </span>
        </div>

        <output className="block text-sm text-slate-300">{completionMessage}</output>
        {pendingCount > 0 && <p className="text-sm text-slate-300">{pendingCount} waiting for parent approval</p>}
        {syncError && <p role="alert" className="text-sm text-amber-200">Could not refresh chores. Trying again automatically.</p>}
        {tasks.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 p-8 sm:p-12 rounded-3xl text-center space-y-3">
            <div className="text-6xl">🎉</div>
            <h3 className="text-2xl font-bold text-slate-300">All done for today!</h3>
            <p className="text-slate-500">No pending chores left on your queue right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {tasks.map((task) => {
              const substeps = task.subSteps || [];
              const allSubstepsDone =
                substeps.every((s) => checkedSubsteps[s.id]);

              return (
                <div
                  key={task.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between shadow-2xl backdrop-blur-sm transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {task.imageUrl ? (
                        <Image
                          src={task.imageUrl}
                          alt={task.title}
                          width={64}
                          height={64}
                          unoptimized
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-700"
                        />
                      ) : (
                        <span className="text-5xl">{task.icon}</span>
                      )}
                      <div>
                        <h3 className="wrap-break-word text-xl font-bold sm:text-2xl">{task.title}</h3>
                        <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 font-extrabold text-sm px-3 py-1 rounded-full border border-amber-500/20 mt-1">
                          <Star className="w-4 h-4 fill-amber-400" /> +{task.starValue} Stars
                        </div>
                      </div>
                    </div>
                  </div>

                  {substeps.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                      <p className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                        Steps to complete:
                      </p>
                      {substeps.map((sub) => {
                        const isChecked = Boolean(checkedSubsteps[sub.id]);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => toggleSubstep(sub.id)}
                            className={`w-full min-h-14 flex items-center justify-between p-3 rounded-xl border text-left text-sm font-semibold transition ${
                              isChecked
                                ? "bg-indigo-950/50 border-indigo-500/50 text-indigo-200"
                                : "bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                            }`}
                          >
                            <span>{sub.title}</span>
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                                isChecked
                                  ? "bg-indigo-600 border-indigo-400 text-white"
                                  : "border-slate-700 bg-slate-900"
                              }`}
                            >
                              {isChecked && <Check className="w-4 h-4" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-end">
                    <button
                      onClick={() => handleCompleteChore(task.id)}
                      disabled={!allSubstepsDone || submitting || syncError}
                      className={`w-full min-h-14 font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 text-lg ${
                        allSubstepsDone
                          ? "bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                      }`}
                    >
                      {allSubstepsDone ? "Mark Completed!" : "Complete all steps above"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}