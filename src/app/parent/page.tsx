"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, CheckSquare, Gift, Layers, Upload, RotateCcw, FileText, 
  Shield, Check, X, Eye, EyeOff, Calendar, Star, RefreshCw, Plus, Clock
} from "lucide-react";

export default function ParentDashboard() {
  const [activeMenu, setActiveMenu] = useState<
    "family" | "task_vault" | "assign_tasks" | "shop_vault" | "task_approvals" | "shop_approvals" | "refunds" | "audit"
  >("task_approvals");

  // Data States
  const [children, setChildren] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Task Creation Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskIcon, setTaskIcon] = useState("⭐");
  const [starValue, setStarValue] = useState(1);
  const [subSteps, setSubSteps] = useState<string[]>([""]);

  // Assignment Controls
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [assignmentDay, setAssignmentDay] = useState<number>(1); // 1 = Mon

  // Bulk Import
  const [importType, setImportType] = useState<"TASKS" | "REWARDS">("TASKS");
  const [importJson, setImportJson] = useState("");

  useEffect(() => {
    loadPortalData();
  }, [selectedMonth]);

  async function loadPortalData() {
    try {
      const [childRes, taskRes, rewardRes, pendingTaskRes, pendingRedempRes, logRes] = await Promise.all([
        fetch("/api/children"),
        fetch("/api/tasks"),
        fetch(`/api/rewards?month=${selectedMonth}`),
        fetch("/api/completions?status=PENDING"),
        fetch("/api/redemptions?status=PENDING"),
        fetch("/api/audit-logs"),
      ]);

      if (childRes.ok) setChildren(await childRes.json());
      if (taskRes.ok) setTasks(await taskRes.json());
      if (rewardRes.ok) setRewards(await rewardRes.json());
      if (pendingTaskRes.ok) setPendingTasks(await pendingTaskRes.json());
      if (pendingRedempRes.ok) setPendingRedemptions(await pendingRedempRes.json());
      if (logRes.ok) setAuditLogs(await logRes.json());
    } catch (err) {
      console.error("Error loading dashboard data", err);
    }
  }

  // --- Task Approvals / Declines ---
  const handleTaskApproval = async (completionId: string, action: "APPROVE" | "DECLINE") => {
    setPendingTasks((prev) => prev.filter((t) => t.id !== completionId));
    await fetch("/api/completions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId, action }),
    });
    loadPortalData();
  };

  // --- Shop Approvals / Declines ---
  const handleShopApproval = async (redemptionId: string, action: "APPROVE" | "DECLINE") => {
    setPendingRedemptions((prev) => prev.filter((r) => r.id !== redemptionId));
    await fetch("/api/redemptions/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId, action }),
    });
    loadPortalData();
  };

  // --- Task Assignment ---
  const handleAssignTask = async () => {
    if (!selectedChildId || !selectedTaskId) return;
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: selectedChildId, taskId: selectedTaskId, dayOfWeek: assignmentDay }),
    });
    alert("Task scheduled successfully!");
    loadPortalData();
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* ----------------- LEFT SIDEBAR NAVIGATION ----------------- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800/80">
            <Shield className="w-7 h-7 text-indigo-400" />
            <div>
              <h1 className="font-extrabold text-sm tracking-tight">Parent Portal</h1>
              <p className="text-[10px] text-slate-400">Control Center</p>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-semibold">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 pb-1">Approvals</div>
            <button
              onClick={() => setActiveMenu("task_approvals")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                activeMenu === "task_approvals" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-2.5"><CheckSquare className="w-4 h-4" /> Chore Approvals</span>
              {pendingTasks.length > 0 && <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">{pendingTasks.length}</span>}
            </button>

            <button
              onClick={() => setActiveMenu("shop_approvals")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                activeMenu === "shop_approvals" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-2.5"><Gift className="w-4 h-4" /> Shop Requests</span>
              {pendingRedemptions.length > 0 && <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">{pendingRedemptions.length}</span>}
            </button>

            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 pt-4 pb-1">Vault & Schedules</div>
            <button
              onClick={() => setActiveMenu("task_vault")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeMenu === "task_vault" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Layers className="w-4 h-4" /> Task Vault
            </button>

            <button
              onClick={() => setActiveMenu("assign_tasks")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeMenu === "assign_tasks" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Calendar className="w-4 h-4" /> Schedule Chores
            </button>

            <button
              onClick={() => setActiveMenu("shop_vault")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeMenu === "shop_vault" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Eye className="w-4 h-4" /> Shop Visibility
            </button>

            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 pt-4 pb-1">Management</div>
            <button
              onClick={() => setActiveMenu("family")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeMenu === "family" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Users className="w-4 h-4" /> Family Profiles
            </button>

            <button
              onClick={() => setActiveMenu("refunds")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeMenu === "refunds" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <RotateCcw className="w-4 h-4" /> Refunds
            </button>

            <button
              onClick={() => setActiveMenu("audit")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeMenu === "audit" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileText className="w-4 h-4" /> Audit Log
            </button>
          </nav>
        </div>

        <button onClick={loadPortalData} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-slate-200">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </aside>

      {/* ----------------- MAIN VIEWPORT ----------------- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP SUMMARY HEADER */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/50 px-8 flex items-center justify-between">
          <h2 className="font-bold text-base capitalize">{activeMenu.replace("_", " ")}</h2>

          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Children: <strong className="text-slate-100">{children.length}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Pending Tasks: <strong className="text-slate-100">{pendingTasks.length}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Gift className="w-4 h-4 text-rose-400" />
              <span>Shop Requests: <strong className="text-slate-100">{pendingRedemptions.length}</strong></span>
            </div>
          </div>
        </header>

        {/* VIEWPORT CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* 1. CHORE APPROVALS */}
          {activeMenu === "task_approvals" && (
            <div className="space-y-4">
              {pendingTasks.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center text-slate-500">
                  No pending chore approvals right now!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingTasks.map((comp) => (
                    <div key={comp.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{comp.task?.icon}</span>
                        <div>
                          <h3 className="font-bold text-base">{comp.task?.title}</h3>
                          <p className="text-xs text-slate-400">Child: <strong className="text-indigo-300">{comp.child?.name}</strong> • Worth +{comp.task?.starValue} Stars</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleTaskApproval(comp.id, "DECLINE")} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl">
                          <X className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleTaskApproval(comp.id, "APPROVE")} className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center gap-2 font-bold text-xs">
                          <Check className="w-5 h-5" /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. SHOP APPROVALS */}
          {activeMenu === "shop_approvals" && (
            <div className="space-y-4">
              {pendingRedemptions.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center text-slate-500">
                  No shop reward redemption requests pending!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRedemptions.map((red) => (
                    <div key={red.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{red.reward?.icon}</span>
                        <div>
                          <h3 className="font-bold text-base">{red.reward?.title}</h3>
                          <p className="text-xs text-slate-400">Child: <strong className="text-indigo-300">{red.child?.name}</strong> • Cost: {red.reward?.starCost} Stars</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleShopApproval(red.id, "DECLINE")} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl">
                          <X className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleShopApproval(red.id, "APPROVE")} className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center gap-2 font-bold text-xs">
                          <Check className="w-5 h-5" /> Approve Reward
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. ASSIGN TASKS (Schedule for Day / Week) */}
          {activeMenu === "assign_tasks" && (
            <div className="max-w-2xl bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
              <h3 className="font-bold text-lg">Schedule Task for Child</h3>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Child</label>
                  <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <option value="">-- Choose Child --</option>
                    {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Task</label>
                  <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <option value="">-- Choose Task --</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Day of Week</label>
                  <select value={assignmentDay} onChange={(e) => setAssignmentDay(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, idx) => (
                      <option key={d} value={idx}>{d}</option>
                    ))}
                  </select>
                </div>

                <button onClick={handleAssignTask} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition text-sm">
                  Assign Chore
                </button>
              </div>
            </div>
          )}

          {/* 4. AUDIT TRAIL */}
          {activeMenu === "audit" && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-indigo-400 mr-2">[{log.actor}]</span>
                    <span>{log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}