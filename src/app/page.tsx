"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, ShoppingBag, CheckCircle, Sparkles, Star, ArrowLeft, Clock } from "lucide-react";
import { calculateAgeProfile } from "@/lib/ageRules";
import { useInactivityReset } from "@/hooks/useInactivityReset";

export default function HomeKiosk() {
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [completions, setCompletions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // activeChildId: null = Family Splash Overview, string = Child Profile View
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  // Security PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Auto-reset back to Splash Screen after 45s of inactivity
  useInactivityReset(() => {
    if (activeChildId !== null && !showPinModal) {
      setActiveChildId(null);
    }
  }, 45000);

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

      if (childRes.ok) setChildren(await childRes.json());
      if (taskRes.ok) setTasks(await taskRes.json());
    } catch (err) {
      console.error("Failed to initialize kiosk", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadChildData = useCallback(async () => {
    if (!activeChildId) return;
    const [compRes, assignRes] = await Promise.all([
      fetch(`/api/completions?childId=${activeChildId}`),
      fetch(`/api/assignments?childId=${activeChildId}`),
    ]);

    if (compRes.ok) setCompletions(await compRes.json());
    if (assignRes.ok) setAssignments(await assignRes.json());
  }, [activeChildId]);

  useEffect(() => { loadKioskData(); }, [loadKioskData]);
  useEffect(() => { loadChildData(); }, [loadChildData]);

  const activeChild = children.find((c) => c.id === activeChildId);
  const ageProfile = activeChild ? calculateAgeProfile(new Date(activeChild.dob)) : null;

  const todayDayOfWeek = new Date().getDay();
  const todayAssignments = assignments.filter((a) => a.dayOfWeek === todayDayOfWeek);
  const todayTasks = tasks.filter((t) => todayAssignments.some((a) => a.taskId === t.id));

  const handleUnlockParent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: enteredPin }),
    });

    if (res.ok) {
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
    if (res.ok) loadChildData();
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
        {/* Header Bar */}
        <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-800 mb-6 shadow-2xl">
          <div className="flex items-center gap-3">
            {activeChildId && (
              <button
                onClick={() => setActiveChildId(null)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 text-indigo-400 transition mr-1"
                title="Return to Family Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
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
              onClick={() => {
                setShowPinModal(true);
                setEnteredPin("");
                setPinError(false);
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition"
              title="Unlock Parent Dashboard"
            >
              <Shield className="w-5 h-5 text-indigo-400" />
            </button>
          </div>
        </header>

        {/* VIEW 1: CENTRAL FAMILY OVERVIEW SPLASH SCREEN */}
        {activeChildId === null ? (
          <div className="max-w-4xl mx-auto space-y-8 py-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-100">Who is using the kiosk?</h2>
              <p className="text-sm text-slate-400">Tap your profile to view today's chores & rewards</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {children.map((child) => {
                const ageInfo = calculateAgeProfile(new Date(child.dob));
                return (
                  <button
                    key={child.id}
                    onClick={() => setActiveChildId(child.id)}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 text-left transition transform active:scale-95 shadow-xl flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-5xl group-hover:scale-110 transition duration-200">
                        {child.avatar}
                      </span>
                      <div>
                        <h3 className="text-2xl font-black text-white">{child.name}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          {ageInfo.stageName} ({ageInfo.ageYears} yrs)
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-300" /> {child.stars} Stars
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* VIEW 2: AGE-ADAPTIVE INDIVIDUAL DASHBOARD */
          activeChild && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{activeChild.avatar}</span>
                  <div>
                    <h2 className="text-2xl font-black text-white">{activeChild.name}</h2>
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                      {ageProfile?.stageName} Tier
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-5 py-2.5 rounded-2xl text-base font-black flex items-center gap-2">
                    <Star className="w-5 h-5 fill-amber-300" /> {activeChild.stars} Stars
                  </div>
                  <button
                    onClick={() => setActiveChildId(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" /> Switch Profile
                  </button>
                </div>
              </div>

              {/* Task Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xl font-black text-slate-200 flex items-center gap-2">
                    <span>📋</span> Today's Chores
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    Max Target: Up to {ageProfile?.maxDailyTasks} tasks
                  </span>
                </div>

                {/* AGE-BASED TIER LAYOUT SWITCHER */}
                <div
                  className={
                    ageProfile?.tier === "toddler"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                      : ageProfile?.tier === "teen"
                      ? "space-y-3"
                      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  }
                >
                  {todayTasks.length === 0 ? (
                    <div className="col-span-full bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-10 text-center text-slate-500">
                      🎉 No chores scheduled for today!
                    </div>
                  ) : (
                    todayTasks.map((task) => {
                      const comp = completions.find((c) => c.taskId === task.id);
                      const isPending = comp?.status === "PENDING";
                      const isApproved = comp?.status === "APPROVED";

                      // TODDLER TIER: Extra Large Touch Targets & Giant Emoji
                      if (ageProfile?.tier === "toddler") {
                        return (
                          <div
                            key={task.id}
                            className={`bg-slate-900 border-2 rounded-3xl p-6 shadow-2xl flex flex-col justify-between ${
                              isApproved
                                ? "border-emerald-500/40 bg-emerald-950/20"
                                : isPending
                                ? "border-amber-500/50 bg-amber-950/20"
                                : "border-slate-800 hover:border-indigo-500"
                            }`}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <span className="text-6xl">{task.icon}</span>
                              <div>
                                <h4 className="text-2xl font-black">{task.title}</h4>
                                <span className="text-amber-300 font-black text-sm">
                                  + {task.starValue} Stars ⭐
                                </span>
                              </div>
                            </div>

                            {isApproved ? (
                              <div className="w-full bg-emerald-500/20 text-emerald-300 py-4 rounded-2xl font-black text-lg text-center">
                                ✅ Done!
                              </div>
                            ) : isPending ? (
                              <div className="w-full bg-amber-500/20 text-amber-300 py-4 rounded-2xl font-black text-lg text-center">
                                ⏳ Waiting for Parent
                              </div>
                            ) : (
                              <button
                                onClick={() => handleMarkComplete(task.id)}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 font-black py-5 rounded-2xl text-xl transition active:scale-95 shadow-lg"
                              >
                                Tap when Done! ✨
                              </button>
                            )}
                          </div>
                        );
                      }

                      // TEEN TIER: Sleek Horizontal Rows
                      if (ageProfile?.tier === "teen") {
                        return (
                          <div
                            key={task.id}
                            className={`bg-slate-900 border rounded-2xl p-4 shadow-md flex items-center justify-between ${
                              isApproved
                                ? "border-emerald-500/30 bg-emerald-950/10 opacity-60"
                                : isPending
                                ? "border-amber-500/30 bg-amber-950/10"
                                : "border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{task.icon}</span>
                              <div>
                                <h4 className="font-bold text-sm text-slate-100">{task.title}</h4>
                                <span className="text-[10px] text-slate-400">
                                  Reward: {task.starValue} Stars
                                </span>
                              </div>
                            </div>

                            {isApproved ? (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Approved
                              </span>
                            ) : isPending ? (
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                <Sparkles className="w-4 h-4" /> Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handleMarkComplete(task.id)}
                                className="bg-indigo-600 hover:bg-indigo-500 font-bold px-4 py-2 rounded-xl text-xs transition"
                              >
                                Mark Complete
                              </button>
                            )}
                          </div>
                        );
                      }

                      // PRIMARY KID TIER: Arcade Grid Cards
                      return (
                        <div
                          key={task.id}
                          className={`bg-slate-900 border rounded-3xl p-5 shadow-xl flex flex-col justify-between ${
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
            </div>
          )
        )}
      </div>

      {/* Security PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
            <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold mb-1">Parent Verification</h3>
            <p className="text-xs text-slate-400 mb-4">Enter security PIN</p>

            <form onSubmit={handleUnlockParent} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value.replace(/\D/g, ""));
                  setPinError(false);
                }}
                placeholder="••••"
                className={`w-full bg-slate-800 border text-center text-2xl font-mono tracking-widest py-2.5 rounded-xl focus:outline-none ${
                  pinError ? "border-red-500 text-red-400" : "border-slate-700 text-indigo-300"
                }`}
              />
              {pinError && <p className="text-xs text-red-400 font-semibold">Incorrect PIN</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setEnteredPin("");
                  }}
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