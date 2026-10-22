"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, ShoppingBag, Star } from "lucide-react";
import { Child, Task, TaskAssignmentPayload } from "@/types";

export default function KidKioskPage({ params }: { params: Promise<{ childId: string }> }) {
  const resolvedParams = use(params);
  const childId = resolvedParams.childId;
  const router = useRouter();

  const [child, setChild] = useState<Child | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Inactivity timeout auto-redirect to home
  const resetTimer = useCallback(() => {
    return setTimeout(() => {
      router.push("/");
    }, 45000); // 45s idle reset
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
    let isSubscribed = true;

    async function loadData() {
      try {
        const [childRes, taskRes] = await Promise.all([
          fetch("/api/children"),
          fetch(`/api/assignments?childId=${childId}`),
        ]);

        if (!isSubscribed) return;

        if (childRes.ok) {
          const children: Child[] = await childRes.json();
          const current = children.find((c) => c.id === childId);
          if (current) setChild(current);
        }

        if (taskRes.ok) {
          const assignments: TaskAssignmentPayload[] = await taskRes.json();
          setTasks(
            assignments
              .map((a) => a.task)
              .filter((t): t is Task => t !== undefined)
          );
        }
      } catch {
        console.error("Failed to load kiosk data");
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [childId]);

  const handleCompleteChore = async (taskId: string) => {
    try {
      const res = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, taskId }),
      });

      if (res.ok) {
        setCompletedTaskIds((prev) => [...prev, taskId]);
      }
    } catch {
      console.error("Failed to submit chore completion");
    }
  };

  if (loading || !child) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-slate-400">Loading Profile...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 select-none">
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition min-h-12 min-w-12 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 text-slate-300" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-5xl">{child.avatar}</span>
            <div>
              <h1 className="text-3xl font-black">{child.name}&apos;s Dashboard</h1>
              <p className="text-xs text-slate-400">Complete daily tasks to earn star rewards!</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span className="text-2xl font-black text-amber-400">{child.stars}</span>
          </div>
          <button
            onClick={() => router.push("/shop")}
            className="bg-indigo-600 hover:bg-indigo-500 font-bold px-5 py-3 rounded-2xl transition flex items-center gap-2 min-h-12"
          >
            <ShoppingBag className="w-5 h-5" /> Reward Shop
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="text-2xl font-black">Today&apos;s Chores</h2>

        {tasks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center text-slate-500">
            🎉 No chores assigned for today!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => {
              const isCompleted = completedTaskIds.includes(task.id);
              return (
                <div
                  key={task.id}
                  className={`bg-slate-900 border rounded-3xl p-6 flex items-center justify-between shadow-xl transition ${
                    isCompleted ? "border-emerald-500/40 bg-emerald-950/10" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{task.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold">{task.title}</h3>
                      <span className="text-amber-400 font-bold text-sm flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-amber-400" /> +{task.starValue} Stars
                      </span>
                    </div>
                  </div>

                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-4 py-3 rounded-2xl border border-emerald-500/20">
                      <CheckCircle className="w-5 h-5" /> Waiting Approval
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCompleteChore(task.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 font-bold px-6 py-4 rounded-2xl transition active:scale-95 text-white shadow-lg min-h-12"
                    >
                      Done!
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}