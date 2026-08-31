"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Check, X, Plus, Sparkles, UserPlus, Trash2, ShoppingBag, Calendar, CheckCircle2 } from "lucide-react";
import { calculateAgeProfile } from "@/lib/ageRules";

const DAYS_OF_WEEK = [
  { id: 1, label: "Mon", full: "Monday" },
  { id: 2, label: "Tue", full: "Tuesday" },
  { id: 3, label: "Wed", full: "Wednesday" },
  { id: 4, label: "Thu", full: "Thursday" },
  { id: 5, label: "Fri", full: "Friday" },
  { id: 6, label: "Sat", full: "Saturday" },
  { id: 0, label: "Sun", full: "Sunday" },
];

export default function ParentDashboard() {
  const [activeTab, setActiveTab] = useState<"approvals" | "planner" | "vault" | "shop" | "children">("approvals");

  const [approvals, setApprovals] = useState<{ pendingTasks: any[]; pendingRewards: any[] }>({
    pendingTasks: [],
    pendingRewards: [],
  });
  const [children, setChildren] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  // Weekly Planner State
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [addingDayId, setAddingDayId] = useState<number | null>(null);

  // Task Vault Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStars, setTaskStars] = useState(2);
  const [taskIcon, setTaskIcon] = useState("⭐");

  // Shop Form State
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardCost, setRewardCost] = useState(5);
  const [rewardIcon, setRewardIcon] = useState("🎁");
  const [rewardStock, setRewardStock] = useState(4);
  const [rewardMinAge, setRewardMinAge] = useState(2);
  const [rewardMaxAge, setRewardMaxAge] = useState(18);
  const [selectedRewardChildIds, setSelectedRewardChildIds] = useState<string[]>([]);

  // Child Form State
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [childAvatar, setChildAvatar] = useState("🦁");

  const loadAllData = useCallback(async () => {
    const [appRes, childRes, taskRes, shopRes] = await Promise.all([
      fetch("/api/approvals"),
      fetch("/api/children"),
      fetch("/api/tasks"),
      fetch("/api/rewards"),
    ]);

    if (appRes.ok) setApprovals(await appRes.json());
    if (childRes.ok) {
      const chData = await childRes.json();
      setChildren(chData);
      if (chData.length > 0 && !selectedChildId) {
        setSelectedChildId(chData[0].id);
      }
    }
    if (taskRes.ok) setTasks(await taskRes.json());
    if (shopRes.ok) setRewards(await shopRes.json());
  }, [selectedChildId]);

  const loadAssignments = useCallback(async () => {
    if (!selectedChildId) return;
    const res = await fetch(`/api/assignments?childId=${selectedChildId}`);
    if (res.ok) {
      const data = await res.json();
      setAssignments(data);
    }
  }, [selectedChildId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const activeChild = children.find((c) => c.id === selectedChildId);
  const ageProfile = activeChild ? calculateAgeProfile(new Date(activeChild.dob)) : null;

  const handleToggleAssignment = async (taskId: string, dayOfWeek: number) => {
    if (!selectedChildId) return;

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: selectedChildId, taskId, dayOfWeek }),
    });

    if (res.ok) {
      loadAssignments();
    }
  };

  const handleProcessApproval = async (id: string, type: "TASK" | "REWARD", action: "APPROVE" | "DECLINE") => {
    const res = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type, action }),
    });

    if (res.ok) loadAllData();
  };

  const handleDeleteChild = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}? This will delete all their task completions.`)) return;
    const res = await fetch(`/api/children?id=${id}`, { method: "DELETE" });
    if (res.ok) loadAllData();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, starValue: taskStars, icon: taskIcon, minAge: 2, maxAge: 18 }),
    });

    setTaskTitle("");
    loadAllData();
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle) return;

    await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: rewardTitle,
        starCost: rewardCost,
        icon: rewardIcon,
        monthlyStock: rewardStock,
        minAge: rewardMinAge,
        maxAge: rewardMaxAge,
        assignedChildIds: selectedRewardChildIds,
      }),
    });

    setRewardTitle("");
    setSelectedRewardChildIds([]);
    loadAllData();
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName || !childDob) return;

    await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: childName, dob: childDob, avatar: childAvatar }),
    });

    setChildName("");
    setChildDob("");
    loadAllData();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans select-none">
      {/* Navigation Header */}
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition">
            <ArrowLeft className="w-6 h-6 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2">
              <Shield className="w-8 h-8 text-indigo-400" /> Parent Portal
            </h1>
            <p className="text-xs text-slate-400">Review task submissions, manage vault, and configure reward shop</p>
          </div>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "approvals" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Approvals
            {(approvals.pendingTasks.length > 0 || approvals.pendingRewards.length > 0) && (
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                {approvals.pendingTasks.length + approvals.pendingRewards.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "planner" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" /> Weekly Planner
          </button>
          <button
            onClick={() => setActiveTab("vault")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "vault" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Task Vault ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab("shop")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "shop" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Reward Shop ({rewards.length})
          </button>
          <button
            onClick={() => setActiveTab("children")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "children" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Children ({children.length})
          </button>
        </div>
      </header>

      {/* TAB 1: PENDING APPROVALS QUEUE */}
      {activeTab === "approvals" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Pending Approval Requests</h2>

          {approvals.pendingTasks.length === 0 && approvals.pendingRewards.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500">
              🎉 No pending approvals! All completed tasks and reward redemptions have been processed.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvals.pendingTasks.map((app) => (
                <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{app.child.avatar}</span>
                    <div>
                      <h3 className="font-bold text-lg">{app.child.name} completed:</h3>
                      <p className="text-slate-300 font-black text-xl flex items-center gap-2">
                        <span>{app.task.icon}</span> {app.task.title}
                      </p>
                      <span className="text-xs font-bold text-amber-400">Award: +{app.task.starValue} Stars</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleProcessApproval(app.id, "TASK", "DECLINE")}
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl transition"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => handleProcessApproval(app.id, "TASK", "APPROVE")}
                      className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl transition"
                    >
                      <Check className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}

              {approvals.pendingRewards.map((red) => (
                <div key={red.id} className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{red.child.avatar}</span>
                    <div>
                      <h3 className="font-bold text-lg">{red.child.name} wants to redeem:</h3>
                      <p className="text-amber-400 font-black text-xl flex items-center gap-2">
                        <span>{red.reward.icon}</span> {red.reward.title}
                      </p>
                      <span className="text-xs font-bold text-slate-400">Cost: {red.reward.starCost} Stars</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleProcessApproval(red.id, "REWARD", "DECLINE")}
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl transition"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => handleProcessApproval(red.id, "REWARD", "APPROVE")}
                      className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl transition"
                    >
                      <Check className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WEEKLY PLANNER MATRIX */}
      {activeTab === "planner" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Child:</span>
              <div className="flex gap-2">
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChildId(c.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                      selectedChildId === c.id ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>{c.avatar}</span> {c.name}
                  </button>
                ))}
              </div>
            </div>

            {activeChild && ageProfile && (
              <div className="text-right">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  {ageProfile.stageName} ({ageProfile.ageYears} yrs)
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Recommended Limit: Up to {ageProfile.maxDailyTasks} tasks/day</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const dayAssignments = assignments.filter((a) => a.dayOfWeek === day.id);
              const isLimitExceeded = ageProfile ? dayAssignments.length > ageProfile.maxDailyTasks : false;

              return (
                <div key={day.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                      <span className="font-bold text-sm text-slate-200">{day.label}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isLimitExceeded ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {dayAssignments.length} / {ageProfile?.maxDailyTasks || 5}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[140px]">
                      {dayAssignments.length === 0 ? (
                        <span className="text-[10px] text-slate-600 block text-center py-6">No tasks set</span>
                      ) : (
                        dayAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="bg-slate-800/80 border border-slate-700/80 p-2 rounded-xl flex items-center justify-between text-xs"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span>{a.task.icon}</span> <strong className="truncate text-slate-200">{a.task.title}</strong>
                            </span>
                            <button
                              onClick={() => handleToggleAssignment(a.taskId, day.id)}
                              className="text-slate-500 hover:text-red-400 transition ml-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setAddingDayId(day.id)}
                    className="w-full mt-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Add Task
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* POPUP MODAL: Add Task to Specific Day */}
      {addingDayId !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>📅</span> Add Tasks for {DAYS_OF_WEEK.find((d) => d.id === addingDayId)?.full}
                </h3>
                <p className="text-xs text-slate-400">Select chores from your Task Vault for {activeChild?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAddingDayId(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {tasks.map((task) => {
                const isAssigned = assignments.some(
                  (a) => a.taskId === task.id && a.dayOfWeek === addingDayId
                );
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={async () => {
                      await handleToggleAssignment(task.id, addingDayId);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                      isAssigned
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-800/50 border-slate-700/70 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{task.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm">{task.title}</h4>
                        <span className="text-[10px] text-amber-400 font-bold">⭐ {task.starValue} Stars</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAssigned ? (
                        <span className="text-xs font-bold bg-indigo-500 text-white px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Added
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Add
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setAddingDayId(null)}
              className="w-full mt-5 bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-2xl text-xs transition"
            >
              Done Managing Day
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: TASK VAULT */}
      {activeTab === "vault" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Add Task to Master Vault
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Chore Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Wash Dishes or Read Book"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    value={taskIcon}
                    onChange={(e) => setTaskIcon(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Star Reward</label>
                  <input
                    type="number"
                    value={taskStars}
                    onChange={(e) => setTaskStars(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" /> Save to Vault
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold">Master Task Vault ({tasks.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{task.icon}</span>
                    <div>
                      <h3 className="font-bold">{task.title}</h3>
                      <p className="text-xs text-slate-400">Ages {task.minAge}–{task.maxAge} yrs</p>
                    </div>
                  </div>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-bold text-sm">
                    ⭐ {task.starValue} Stars
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REWARD SHOP MANAGER WITH AGE BRACKETS & PER-CHILD TOGGLES */}
      {activeTab === "shop" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" /> Create Shop Reward
            </h2>
            <form onSubmit={handleCreateReward} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reward Name</label>
                <input
                  type="text"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  placeholder="e.g. 30 Mins Screen Time"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Icon</label>
                  <input
                    type="text"
                    value={rewardIcon}
                    onChange={(e) => setRewardIcon(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-center text-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Star Cost</label>
                  <input
                    type="number"
                    value={rewardCost}
                    onChange={(e) => setRewardCost(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 font-bold text-amber-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Monthly Stock</label>
                  <input
                    type="number"
                    value={rewardStock}
                    onChange={(e) => setRewardStock(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 font-bold text-slate-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Age Bracket</label>
                <select
                  onChange={(e) => {
                    const [min, max] = e.target.value.split("-").map(Number);
                    setRewardMinAge(min);
                    setRewardMaxAge(max);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="2-4">Toddler Stage (Ages 2–4)</option>
                  <option value="5-8">Early Primary (Ages 5–8)</option>
                  <option value="9-12">Upper Primary (Ages 9–12)</option>
                  <option value="2-18">All Ages (2–18 yrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Assign To Specific Children (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {children.map((child) => {
                    const isSelected = selectedRewardChildIds.includes(child.id);
                    return (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRewardChildIds(selectedRewardChildIds.filter((id) => id !== child.id));
                          } else {
                            setSelectedRewardChildIds([...selectedRewardChildIds, child.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-400 text-white"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                      >
                        <span>{child.avatar}</span> {child.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                + Save Reward to Inventory
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold">Active Reward Inventory ({rewards.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((rw) => (
                <div key={rw.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{rw.icon}</span>
                      <div>
                        <h3 className="font-bold">{rw.title}</h3>
                        <p className="text-xs text-slate-400">
                          Stock: <strong className="text-indigo-400">{rw.currentStock} / {rw.monthlyStock}</strong> | Ages {rw.minAge}–{rw.maxAge} yrs
                        </p>
                      </div>
                    </div>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-bold text-sm">
                      ⭐ {rw.starCost}
                    </span>
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Visible To:</span>
                    <div className="flex gap-1.5">
                      {children.map((c) => {
                        const isAssigned = rw.assignments?.some((a: any) => a.childId === c.id) || rw.assignments?.length === 0;
                        return (
                          <button
                            key={c.id}
                            onClick={async () => {
                              await fetch("/api/rewards/assign", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ rewardId: rw.id, childId: c.id }),
                              });
                              loadAllData();
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                              isAssigned
                                ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                                : "bg-slate-800 border-slate-700 text-slate-500"
                            }`}
                          >
                            {c.avatar} {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CHILDREN MANAGER */}
      {activeTab === "children" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" /> Add Additional Child
            </h2>
            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Child's Name</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Archie or Rupert"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={childDob}
                  onChange={(e) => setChildDob(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Avatar Emoji</label>
                <div className="flex gap-2">
                  {["🦁", "🐻", "🦊", "🦕", "🚀", "🦄"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setChildAvatar(e)}
                      className={`text-2xl p-2 rounded-xl border ${childAvatar === e ? "bg-indigo-600 border-indigo-400" : "bg-slate-800 border-slate-700"}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-xl transition shadow-lg"
              >
                Save Family Profile
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold">Family Profiles ({children.length})</h2>
            <div className="space-y-3">
              {children.map((child) => (
                <div key={child.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{child.avatar}</span>
                    <div>
                      <h3 className="font-bold text-lg">{child.name}</h3>
                      <p className="text-xs text-slate-400">DOB: {new Date(child.dob).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-amber-400 font-bold">⭐ {child.stars} Stars</span>
                    <button
                      onClick={() => handleDeleteChild(child.id, child.name)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}