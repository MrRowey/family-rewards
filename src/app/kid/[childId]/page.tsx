"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Star, ListCheck, Check } from "lucide-react";

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
  stars: number;
}

export default function KidKioskPage({ params }: { params: Promise<{ childId: string }> }) {
  const resolvedParams = use(params);
  const { childId } = resolvedParams;
  const router = useRouter();

  const [child, setChild] = useState<Child | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkedSubsteps, setCheckedSubsteps] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const resetTimer = useCallback(() => {
    return setTimeout(() => router.push("/"), 45000);
  }, [router]);

  useEffect(() => {
    let timer = resetTimer();
    const handleActivity = () => {
      clearTimeout(timer);
      timer = resetTimer();
    };
    window.addEventListener("pointerdown", handleActivity);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleActivity);
    };
  }, [resetTimer]);

  useEffect(() => {
    async function loadData() {
      try {
        const [childRes, taskRes, compRes] = await Promise.all([
          fetch("/api/children"),
          fetch(`/api/assignments?childId=${childId}&day=today`),
          fetch(`/api/completions?childId=${childId}&date=today`),
        ]);

        let completedOrPendingTaskIds: string[] = [];
        if (compRes.ok) {
          const completions = await compRes.json();
          completedOrPendingTaskIds = completions
            .filter((c: { status: string }) => c.status === "PENDING" || c.status === "APPROVED")
            .map((c: { taskId: string }) => c.taskId);
        }

        if (childRes.ok) {
          const children: Child[] = await childRes.json();
          const current = children.find((c) => c.id === childId);
          if (current) setChild(current);
        }

        if (taskRes.ok) {
          const assignments = await taskRes.json();
          const availableTasks = assignments
            .map((a: { task: Task }) => a.task)
            .filter((t: Task) => t && !completedOrPendingTaskIds.includes(t.id));

          setTasks(availableTasks);
        }
      } catch (err) {
        console.error("Failed to load kiosk data", err);
      } fontally {
        setLoading(false);
      }
    }

    loadData();
  }, [childId]);

  const toggleSubstep = (substepId: string) => {
    setCheckedSubsteps((prev) => ({ ...prev, [substepId]: !prev[substepId] }));
  };

  const handleCompleteChore = async (taskId: string) => {
    try {
      const res = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, taskId }),
      });

      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch {
      console.error("Failed to submit chore completion");
    }
  };

  if (loading || !child) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-slate-400">Opening Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-8 select-none">
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-800/80 bg-slate-900/40 p-6 rounded-3xl backdrop-blur-md">
        <div className="flex items-center gap-5">
          <button
            onClick={() => router.push("/")}
            className="p-4 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-2xl transition flex items-center justify-center border border-slate-700/50 shadow-lg"
          >
            <ArrowLeft className="w-7 h-7 text-slate-200" />
          </button>

          <div className="relative">
            {child.avatar.startsWith("/") ? (
              <img
                src={child.avatar}
                alt={child.name}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-xl"
              />
            ) : (
              <span className="text-6xl filter drop-shadow-md">{child.avatar}</span>
            )}
          </div>

          <div>
            <h1 className="text-4xl font-black tracking-tight">{child.name}&apos;s Dashboard</h1>
            <p className="text-sm text-slate-400 font-medium">Complete daily chores to earn shiny stars!</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-amber-500/10 border border-amber-500/30 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-inner">
            <Star className="w-8 h-8 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="text-3xl font-black text-amber-400">{child.stars}</span>
          </div>
          <button
            onClick={() => router.push("/shop")}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-black px-6 py-4 rounded-2xl transition flex items-center gap-3 shadow-lg active:scale-95"
          >
            <ShoppingBag className="w-6 h-6" /> Reward Shop
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ListCheck className="w-8 h-8 text-indigo-400" /> Today&apos;s Chores
          </h2>
          <span className="text-sm font-semibold bg-indigo-950 text-indigo-300 px-4 py-1.5 rounded-full border border-indigo-800/50">
            {tasks.length} Left
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 p-16 rounded-3xl text-center space-y-3">
            <div className="text-6xl">🎉</div>
            <h3 className="text-2xl font-bold text-slate-300">All done for today!</h3>
            <p className="text-slate-500">No pending chores left on your queue right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => {
              const substeps = task.subSteps || [];
              const allSubstepsDone =
                substeps.length === 0 || substeps.every((s) => checkedSubsteps[s.id]);

              return (
                <div
                  key={task.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between shadow-2xl backdrop-blur-sm transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {task.imageUrl ? (
                        <img
                          src={task.imageUrl}
                          alt={task.title}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-700"
                        />
                      ) : (
                        <span className="text-5xl">{task.icon}</span>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold">{task.title}</h3>
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
                            onClick={() => toggleSubstep(sub.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-sm font-semibold transition ${
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
                      disabled={!allSubstepsDone}
                      className={`w-full font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 text-lg ${
                        allSubstepsDone
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer"
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