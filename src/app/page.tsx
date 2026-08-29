"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, ShoppingBag, CheckCircle, Sparkles, Star } from "lucide-react";
import { calculateAgeProfile } from "@/lib/ageRules";

export default function HomeKiosk() {
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [activeChildId, setActiveChildId] = useState<string>("");
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Security PIN Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const loadKioskData = useCallback(async () => {
    try {
      const [cfgRes, childRes, taskRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/children"),
        fetch("/api/tasks"),
      ]);

      const cfgData = await cfgRes.json();
      setConfig(cfgData);

      if (!cfgData.isConfigured) {
        router.push("/setup");
        return;
      }

      if (childRes.ok) {
        const childData = await childRes.json();
        setChildren(childData);
        if (childData.length > 0 && !activeChildId) {
          setActiveChildId(childData[0].id);
        }
      }

      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData);
      }
    } catch (err) {
      console.error("Failed to initialize kiosk", err);
    } finally {
      setLoading(false);
    }
  }, [router, activeChildId]);

  const loadCompletions = useCallback(async () => {
    if (!activeChildId) return;
    const res = await fetch(`/api/completions?childId=${activeChildId}`);
    if (res.ok) {
      const data = await res.json();
      setCompletions(data);
    }
  }, [activeChildId]);

  useEffect(() => {
    loadKioskData();
  }, [loadKioskData]);

  useEffect(() => {
    loadCompletions();
  }, [loadCompletions]);

  const activeChild = children.find((c) => c.id === activeChildId);
  const ageProfile = activeChild ? calculateAgeProfile(new Date(activeChild.dob)) : null;

  const handleUnlockParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === config?.parentPin) {
      router.push("/parent");
    } else {
      setPinError(true);
      setEnteredPin("");
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    if (!activeChildId) return;

    const res = await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: activeChildId, taskId }),
    });

    if (res.ok) {
      loadCompletions();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <p className="animate-pulse font-black text-xl flex items-center gap-2">
          <span>🌟</span> Loading Family Kiosk...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans select-none flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-800 mb-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌟</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Family Rewards</h1>
              <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">
                Touchscreen Kiosk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl text-xs font-bold transition flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Reward Shop
            </Link>

            <button
              onClick={() => setShowPinModal(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition"
              title="Unlock Parent Dashboard"
            >
              <Shield className="w-5 h-5 text-indigo-400" />
            </button>
          </div>
        </header>

        {/* Child Avatar Switcher */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {children.map((child) => {
            const isActive = child.id === activeChildId;
            return (
              <button
                key={child.id}
                onClick={() => setActiveChildId(child.id)}
                className={`flex items-center gap-3 px-6 py-3.5 rounded-3xl border transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/30 scale-105"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400"
                }`}
              >
                <span className="text-3xl">{child.avatar}</span>
                <div className="text-left">
                  <h2 className="font-black text-base leading-tight text-white">{child.name}</h2>
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300" /> {child.stars} Stars
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Child Chores Checklist */}
        {activeChild && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-black text-slate-200 flex items-center gap-2">
                <span>📋</span> Today's Chores ({ageProfile?.stageName})
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                Target: Up to {ageProfile?.maxDailyTasks} tasks daily
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.length === 0 ? (
                <div className="col-span-full bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-10 text-center text-slate-500">
                  No chores added to vault yet. Use the Parent Portal (Shield icon) to add tasks!
                </div>
              ) : (
                tasks.map((task) => {
                  const comp = completions.find((c) => c.taskId === task.id);
                  const isPending = comp?.status === "PENDING";
                  const isApproved = comp?.status === "APPROVED";
                  // DECLINED tasks are treated like fresh, uncompleted tasks

                  return (
                    <div
                      key={task.id}
                      className={`bg-slate-900 border rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between ${
                        isApproved
                          ? "border-emerald-500/30 bg-emerald-950/10 opacity-70"
                          : isPending
                          ? "border-amber-500/40 bg-amber-950/10"
                          : "border-slate-800 hover:border-indigo-500/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-4xl">{task.icon}</span>
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-black text-xs">
                          + {task.starValue} ⭐
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-lg mb-1">{task.title}</h4>
                        <p className="text-xs text-slate-400 mb-4">
                          {isApproved
                            ? "✅ Parent Approved! Stars added."
                            : isPending
                            ? "⏳ Submitted! Waiting for parent approval."
                            : "Tap complete when finished"}
                        </p>
                      </div>

                      {isApproved ? (
                        <div className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Completed & Approved
                        </div>
                      ) : isPending ? (
                        <div className="w-full bg-amber-500/20 text-amber-400 border border-amber-500/30 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4" /> Pending Approval
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkComplete(task.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
                        >
                          <Sparkles className="w-4 h-4" /> Complete Task
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Security PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
            <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold mb-1">Parent Verification</h3>
            <p className="text-xs text-slate-400 mb-4">Enter 4-digit PIN to open Parent Portal</p>

            <form onSubmit={handleUnlockParent} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                className={`w-full bg-slate-800 border text-center text-3xl font-mono tracking-widest py-2 rounded-xl focus:outline-none ${
                  pinError ? "border-red-500 text-red-400" : "border-slate-700"
                }`}
              />
              {pinError && <p className="text-xs text-red-400 font-semibold">Incorrect PIN</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 font-bold py-2.5 rounded-xl text-xs"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}