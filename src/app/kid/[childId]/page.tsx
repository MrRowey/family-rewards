"use client";

import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useState, useEffect, useRef, use } from "react";
import AvatarDisplay from "@/components/AvatarDisplay";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Star, ListCheck, Check, UserRound } from "lucide-react";
import confetti from "canvas-confetti";
import { sounds } from "@/lib/sound";
import { resolveKioskMode } from "@/lib/kiosk-age-mode";

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

interface Child {
  id: string;
  name: string;
  avatar: string;
  avatarTheme?: string | null;
  avatarConfig?: string | null;
  stars: number;
  avatarCoins: number;
  progress: { level: number; current: number; required: number; percent: number };
  ageYears?: number;
  kioskMode?: "AUTO" | "JUNIOR" | "EXPLORER" | "TEEN";
}

export default function KidKioskPage({ params }: { params: Promise<{ childId: string }> }) {
  const { config: kioskConfig } = useKioskSettings(true);
  const resolvedParams = use(params);
  const { childId } = resolvedParams;
  const router = useRouter();

  const [child, setChild] = useState<Child | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkedSubsteps, setCheckedSubsteps] = useState<Record<string, boolean>>({});
  const submission = useRef(false);
  const completionVersion = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [waitingTasks, setWaitingTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
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
          Child[], { task: Task }[], { status: string; taskId: string; task?: Task }[],
        ] = await Promise.all([childRes.json(), taskRes.json(), compRes.json()]);
        if (latestRequest !== version || completionAtStart !== completionVersion.current) return;

        const pending = new Set(completions.filter((item) => item.status === "PENDING").map((item) => item.taskId));
        const approved = new Set(completions.filter((item) => item.status === "APPROVED").map((item) => item.taskId));
        const scheduled = new Map(assignments.map(({ task }) => [task.id, task]));
        setChild(children.find((item) => item.id === childId) ?? null);
        const records = new Map(completions.flatMap((item) => item.task ? [[item.taskId, item.task] as const] : []));
        const taskDetails = (ids: Set<string>) => [...ids].flatMap((id) => {
          const task = scheduled.get(id) ?? records.get(id);
          return [task ?? { id, title: "Chore details unavailable", icon: "📋", starValue: 0 }];
        });
        setWaitingTasks(taskDetails(pending));
        setDoneTasks(taskDetails(approved));

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
        const submittedTask = tasks.find((task) => task.id === taskId);
        if (submittedTask) setWaitingTasks((previous) => [...previous.filter((task) => task.id !== taskId), submittedTask]);
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

  const displayMode = resolveKioskMode(child.ageYears, child.kioskMode);
  const isJunior = displayMode === "JUNIOR";
  const isTeen = displayMode === "TEEN";

  return (
    <main data-kiosk-mode={displayMode.toLowerCase()} data-large-kiosk-text={kioskConfig.largeKioskText} data-reduced-motion={kioskConfig.reducedMotion} className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 px-4 pt-4 pb-24 text-slate-100 sm:px-6 sm:pt-6 lg:pb-8 select-none touch-manipulation">
      <header className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" onClick={() => router.push("/")} aria-label="Back to Family Hub"
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-400">
            <ArrowLeft size={24} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => router.push(`/kid/${encodeURIComponent(childId)}/profile`)} aria-label="Open my profile"
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-indigo-400">
            {child.avatarConfig ? (
              <AvatarDisplay theme={child.avatarTheme} config={child.avatarConfig} seed={child.id} fallbackEmoji={child.avatar} size={52} />
            ) : child.avatar.startsWith("/") ? (
              <Image src={child.avatar} alt="" width={52} height={52} unoptimized className="h-13 w-13 rounded-xl object-contain" />
            ) : (
              <span aria-hidden="true" className="text-4xl">{child.avatar}</span>
            )}
          </button>
          <div className="min-w-0">
            <h1 className={`wrap-break-word font-black tracking-tight ${isTeen ? "text-xl sm:text-2xl" : "text-xl sm:text-3xl"}`}>
              {child.name}&apos;s {isJunior ? "Chores" : isTeen ? "Tasks" : "Challenges"}
            </h1>
            <p className="text-sm text-slate-400">
              {isJunior ? "Do your chores and collect stars!" : isTeen ? "Keep track of today's tasks." : "Complete challenges to earn rewards!"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div aria-label={`${child.stars} Stars`} className="flex min-h-12 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 font-black text-amber-300">
            <Star size={isJunior ? 24 : 20} className="fill-amber-400" aria-hidden="true" />
            <span className="text-xl">{child.stars}</span>
          </div>
          <button type="button" onClick={() => router.push(`/kid/${encodeURIComponent(childId)}/profile`)}
            className="hidden min-h-12 items-center gap-2 rounded-xl border border-indigo-400/30 bg-slate-800 px-4 font-bold text-indigo-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-400 lg:flex">
            <UserRound size={20} aria-hidden="true" />
            {isJunior ? "My Avatar" : "My Profile"}
            <span className="text-xs text-slate-400">Lv {child.progress?.level ?? 1}</span>
          </button>
          <button type="button" onClick={() => router.push("/shop?childId=" + encodeURIComponent(childId))}
            className="hidden min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-4 font-black text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-300 lg:flex">
            <ShoppingBag size={20} aria-hidden="true" /> {isTeen ? "Shop" : "Reward Shop"}
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
            <ListCheck className="h-6 w-6 text-indigo-400" /> {isTeen ? "Tasks for Today" : isJunior ? "My Chores" : "Today&apos;s Challenges"}
          </h2>
          <span className="text-sm font-semibold bg-indigo-950 text-indigo-300 px-4 py-1.5 rounded-full border border-indigo-800/50">
            {tasks.length} Left
          </span>
        </div>

        {completionMessage && <output className="block text-sm font-semibold text-slate-200">{completionMessage}</output>}

        {syncError && <p role="alert" className="text-sm text-amber-200">Could not refresh chores. Trying again automatically.</p>}
        {tasks.length === 0 ? (
          <section aria-label="No chores remaining" className={`flex items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 text-left sm:px-6 ${isJunior ? "min-h-28 py-6" : isTeen ? "min-h-20 py-4" : "min-h-24 py-5"}`}>
            <span aria-hidden="true" className={isTeen ? "text-3xl text-emerald-400" : "text-4xl"}>{isTeen ? "✓" : "🎉"}</span>
            <div className="min-w-0">
              <h3 className={`font-bold ${isJunior ? "text-xl" : "text-lg"}`}>
                {waitingTasks.length > 0 ? (isJunior ? "Great job! You're finished!" : isTeen ? "All tasks submitted" : "Challenges completed!") : (isTeen ? "No tasks remaining" : "All done for today!")}
              </h3>
              <p className="text-sm text-slate-400">
                {waitingTasks.length > 0 ? "Your completed chores are waiting for approval." : "Check back when new chores are assigned."}
              </p>
            </div>
          </section>
        ) : (
          <div className={`grid grid-cols-1 gap-4 ${isJunior ? "lg:grid-cols-2" : isTeen ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {tasks.map((task) => {
              const substeps = task.subSteps || [];
              const allSubstepsDone =
                substeps.every((s) => checkedSubsteps[s.id]);

              return (
                <div
                  key={task.id}
                  className={`flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg ${isJunior ? "p-6" : isTeen ? "p-4" : "p-5"}`}
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
                        <span className={isTeen ? "text-3xl" : "text-4xl"}>{task.icon}</span>
                      )}
                      <div>
                        <h3 className={`wrap-break-word font-bold ${isJunior ? "text-xl sm:text-2xl" : isTeen ? "text-lg" : "text-xl"}`}>{task.title}</h3>
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

                  <div className="mt-4 flex justify-end border-t border-slate-800/60 pt-3">
                    <button
                      onClick={() => handleCompleteChore(task.id)}
                      disabled={!allSubstepsDone || submitting || syncError}
                      className={`w-full min-h-14 font-black py-3 rounded-xl transition-all active:scale-95 ${isTeen ? "text-base" : "text-lg"} ${
                        allSubstepsDone
                          ? "bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                      }`}
                    >
                      {allSubstepsDone ? (isJunior ? "⭐ I did it!" : isTeen ? "Submit task" : "Mark Completed!") : (isJunior ? "Finish the steps first" : "Complete all steps above")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {isTeen && (waitingTasks.length > 0 || doneTasks.length > 0) && (
      <div className="mx-auto mt-4 grid max-w-6xl gap-3 sm:grid-cols-2">
        {[{ label: "Waiting for approval", items: waitingTasks }, { label: "Done", items: doneTasks }].filter(({ items }) => items.length > 0).map(({ label, items }) => (
          <section key={label} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-lg font-bold">{label} ({items.length})</h2>
            {items.length === 0 ? <p className="mt-2 text-sm text-slate-400">No chores here yet.</p> : (
              <ul className="mt-2 divide-y divide-slate-800">
                {items.map((task) => <li key={task.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 wrap-break-word">{task.icon} {task.title}</span>
                  <span className="shrink-0 text-sm text-amber-300">{task.starValue > 0 ? `${task.starValue} ★` : "—"}</span>
                </li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
      )}
      <nav aria-label="Kiosk navigation" className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around gap-2 border-t border-slate-700 bg-slate-950 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <span aria-current="page" className="flex min-h-12 items-center gap-2 rounded-xl px-2 font-bold text-indigo-300"><ListCheck size={20} aria-hidden="true" /> {isJunior ? "Chores" : "Tasks"}</span>
        <button type="button" onClick={() => router.push(`/kid/${encodeURIComponent(childId)}/profile`)}
          className="flex min-h-12 items-center gap-2 rounded-xl px-2 font-bold text-indigo-200 focus-visible:outline-2 focus-visible:outline-indigo-400">
          <UserRound size={20} aria-hidden="true" /> {isJunior ? "Avatar" : "Profile"}
        </button>
        <button type="button" onClick={() => router.push("/shop?childId=" + encodeURIComponent(childId))}
          className={`flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-indigo-300 ${isJunior ? "min-h-14 text-lg" : ""}`}>
          <ShoppingBag size={isJunior ? 24 : 20} aria-hidden="true" /> Shop
        </button>
      </nav>
    </main>
  );
}