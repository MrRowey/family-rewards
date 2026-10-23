"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, CheckSquare, Gift, Layers, Upload, RotateCcw, FileText, 
  Shield, Check, X, Eye, EyeOff, Calendar, Plus, RefreshCw, LogOut
} from "lucide-react";

interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  stars: number;
  dob: string;
}

interface SubStepItem {
  id: string;
  title: string;
}

interface TaskItem {
  id: string;
  title: string;
  icon: string;
  starValue: number;
  subSteps?: SubStepItem[];
}

interface RewardAssignmentItem {
  childId: string;
}

interface RewardItem {
  id: string;
  title: string;
  icon: string;
  starCost: number;
  monthlyStock: number;
  currentStock: number;
  assignments?: RewardAssignmentItem[];
}

interface TaskCompletionRecord {
  id: string;
  task?: TaskItem;
  child?: ChildProfile;
}

interface RewardRedemptionRecord {
  id: string;
  reward?: RewardItem;
  child?: ChildProfile;
}

interface AuditLogRecord {
  id: string;
  actor: string;
  details: string;
  createdAt: string;
}

export default function ParentDashboard() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<
    "family" | "task_vault" | "assign_tasks" | "shop_vault" | "task_approvals" | "shop_approvals" | "refunds" | "audit"
  >("task_approvals");

  // State Data
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskCompletionRecord[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<RewardRedemptionRecord[]>([]);
  const [redemptionsHistory, setRedemptionsHistory] = useState<RewardRedemptionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Form States
  const [childName, setChildName] = useState("");
  const [childAvatar, setChildAvatar] = useState("🦁");
  const [childDob, setChildDob] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskIcon, setTaskIcon] = useState("⭐");
  const [taskStarValue, setTaskStarValue] = useState(1);
  const [taskSubSteps, setTaskSubSteps] = useState<string[]>([""]);

  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [assignmentDay, setAssignmentDay] = useState<number>(1);

  const [importType, setImportType] = useState<"TASKS" | "REWARDS">("TASKS");
  const [importJson, setImportJson] = useState("");

  const loadPortalData = useCallback(async () => {
    try {
      const [childRes, taskRes, rewardRes, pendingTaskRes, pendingRedempRes, allRedempRes, logRes] = await Promise.all([
        fetch("/api/kiosk/children"),
        fetch("/api/parent/tasks"),
        fetch(`/api/rewards?month=${selectedMonth}`),
        fetch("/api/completions?status=PENDING"),
        fetch("/api/redemptions?status=PENDING"),
        fetch("/api/redemptions"),
        fetch("/api/audit-logs"),
      ]);

      if (childRes.ok) setChildren(await childRes.json());
      if (taskRes.ok) setTasks(await taskRes.json());
      if (rewardRes.ok) setRewards(await rewardRes.json());
      if (pendingTaskRes.ok) setPendingTasks(await pendingTaskRes.json());
      if (pendingRedempRes.ok) setPendingRedemptions(await pendingRedempRes.json());
      if (allRedempRes.ok) setRedemptionsHistory(await allRedempRes.json());
      if (logRes.ok) setAuditLogs(await logRes.json());
    } catch (err) {
      console.error("Failed to load portal data", err);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: childName, avatar: childAvatar, dob: childDob }),
    });
    setChildName("");
    loadPortalData();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSteps = taskSubSteps.filter((s) => s.trim() !== "");
    await fetch("/api/parent/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, icon: taskIcon, starValue: taskStarValue, subSteps: cleanSteps }),
    });
    setTaskTitle("");
    setTaskSubSteps([""]);
    loadPortalData();
  };

  const handleTaskApproval = async (completionId: string, action: "APPROVE" | "DECLINE") => {
    setPendingTasks((prev) => prev.filter((t) => t.id !== completionId));
    await fetch("/api/completions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId, action }),
    });
    loadPortalData();
  };

  const handleShopApproval = async (redemptionId: string, action: "APPROVE" | "DECLINE") => {
    setPendingRedemptions((prev) => prev.filter((r) => r.id !== redemptionId));
    await fetch("/api/redemptions/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId, action }),
    });
    loadPortalData();
  };

  const handleRefund = async (redemptionId: string) => {
    if (!confirm("Refund stars back to child?")) return;
    await fetch("/api/redemptions/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId }),
    });
    loadPortalData();
  };

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

  const toggleRewardVisibility = async (rewardId: string, childId: string, currentlyAssigned: boolean) => {
    await fetch("/api/rewards/assignment", {
      method: currentlyAssigned ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardId, childId }),
    });
    loadPortalData();
  };

  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, items: parsed }),
      });
      alert("Bulk import completed!");
      setImportJson("");
      loadPortalData();
    } catch {
      alert("Invalid JSON format.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h1 className="font-bold text-sm">Parent Command Center</h1>
          </div>

          <nav className="space-y-1 text-xs font-semibold">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 pb-1">Approvals</div>
            <button onClick={() => setActiveMenu("task_approvals")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${activeMenu === "task_approvals" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <span className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Chores</span>
              {pendingTasks.length > 0 && <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingTasks.length}</span>}
            </button>
            <button onClick={() => setActiveMenu("shop_approvals")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${activeMenu === "shop_approvals" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <span className="flex items-center gap-2"><Gift className="w-4 h-4" /> Shop Requests</span>
              {pendingRedemptions.length > 0 && <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingRedemptions.length}</span>}
            </button>

            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 pt-3 pb-1">Vault & Schedules</div>
            <button onClick={() => setActiveMenu("task_vault")} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition ${activeMenu === "task_vault" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <Layers className="w-4 h-4" /> Task Vault
            </button>
            <button onClick={() => setActiveMenu("assign_tasks")} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition ${activeMenu === "assign_tasks" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <Calendar className="w-4 h-4" /> Schedule Chores
            </button>
            <button onClick={() => setActiveMenu("shop_vault")} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition ${activeMenu === "shop_vault" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <Eye className="w-4 h-4" /> Shop Visibility
            </button>

            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 pt-3 pb-1">Administration</div>
            <button onClick={() => setActiveMenu("family")} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition ${activeMenu === "family" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <Users className="w-4 h-4" /> Family Profiles
            </button>
            <button onClick={() => setActiveMenu("refunds")} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition ${activeMenu === "refunds" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <RotateCcw className="w-4 h-4" /> Refunds
            </button>
            <button onClick={() => setActiveMenu("audit")} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition ${activeMenu === "audit" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              <FileText className="w-4 h-4" /> Audit Log
            </button>
          </nav>
        </div>

        <div className="space-y-2">
          <button onClick={loadPortalData} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-slate-200">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition">
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/50 px-8 flex items-center justify-between">
          <h2 className="font-bold text-base capitalize">{activeMenu.replace("_", " ")}</h2>
        </header>

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
                  No shop reward requests pending!
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

          {/* 3. TASK VAULT */}
          {activeMenu === "task_vault" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <form onSubmit={handleCreateTask} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-400" /> Create New Task</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title</label>
                  <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Icon</label>
                    <input type="text" value={taskIcon} onChange={(e) => setTaskIcon(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-center" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Star Reward</label>
                    <input type="number" value={taskStarValue} onChange={(e) => setTaskStarValue(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-center" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400">Sub-Steps (Optional)</label>
                  {taskSubSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={step} onChange={(e) => { const updated = [...taskSubSteps]; updated[idx] = e.target.value; setTaskSubSteps(updated); }} className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs" />
                      <button type="button" onClick={() => setTaskSubSteps(taskSubSteps.filter((_, i) => i !== idx))} className="p-2 text-rose-400"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setTaskSubSteps([...taskSubSteps, ""])} className="text-xs font-bold text-indigo-400">+ Add Step</button>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-2.5 rounded-xl text-xs">Save Task</button>
              </form>

              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-base">Task Vault ({tasks.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-3xl">{task.icon}</span>
                        <span className="text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">+{task.starValue} Stars</span>
                      </div>
                      <h4 className="font-bold text-sm">{task.title}</h4>
                      {task.subSteps && task.subSteps.length > 0 && (
                        <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                          {task.subSteps.map((st) => <p key={st.id}>• {st.title}</p>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. SCHEDULE TASKS */}
          {activeMenu === "assign_tasks" && (
            <div className="max-w-2xl bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
              <h3 className="font-bold text-base">Schedule Task for Child</h3>
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
                <button onClick={handleAssignTask} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition text-xs">Assign Chore</button>
              </div>
            </div>
          )}

          {/* 5. SHOP VISIBILITY */}
          {activeMenu === "shop_vault" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <h3 className="text-base font-bold">Reward Shop Visibility Matrix</h3>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-4">Reward</th>
                      <th className="pb-4">Cost</th>
                      {children.map((c) => <th key={c.id} className="pb-4 text-center">{c.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {rewards.map((reward) => (
                      <tr key={reward.id}>
                        <td className="py-4 font-bold flex items-center gap-2"><span className="text-2xl">{reward.icon}</span>{reward.title}</td>
                        <td className="py-4 text-amber-400 font-bold">{reward.starCost} ⭐</td>
                        {children.map((child) => {
                          const isAssigned = reward.assignments?.some((a) => a.childId === child.id) ?? false;
                          return (
                            <td key={child.id} className="py-4 text-center">
                              <button onClick={() => toggleRewardVisibility(reward.id, child.id, isAssigned)} className={`p-2 rounded-xl border transition ${isAssigned ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-slate-950 border-slate-800 text-slate-500"}`}>
                                {isAssigned ? <Eye className="w-4 h-4 mx-auto" /> : <EyeOff className="w-4 h-4 mx-auto" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. FAMILY PROFILES */}
          {activeMenu === "family" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <form onSubmit={handleCreateChild} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-base font-bold">Add Child Profile</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name</label>
                  <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Avatar Emoji</label>
                  <input type="text" value={childAvatar} onChange={(e) => setChildAvatar(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date of Birth</label>
                  <input type="date" value={childDob} onChange={(e) => setChildDob(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-2.5 rounded-xl text-xs">Save Profile</button>
              </form>

              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-base">Children Profiles ({children.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {children.map((child) => (
                    <div key={child.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{child.avatar}</span>
                        <div>
                          <h4 className="font-bold text-base">{child.name}</h4>
                          <p className="text-xs text-amber-400 font-bold">{child.stars} ⭐ Stars</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. REFUNDS */}
          {activeMenu === "refunds" && (
            <div className="space-y-4">
              <h3 className="font-bold text-base">Redeemed Rewards History</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                {redemptionsHistory.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-xs">No redemptions found.</p>
                ) : (
                  <div className="space-y-3">
                    {redemptionsHistory.map((red) => (
                      <div key={red.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <h4 className="font-bold text-sm">{red.reward?.title}</h4>
                          <p className="text-slate-400">Child: {red.child?.name} • Cost: {red.reward?.starCost} Stars</p>
                        </div>
                        <button onClick={() => handleRefund(red.id)} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-500/20 transition flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" /> Refund Stars
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. AUDIT LOG */}
          {activeMenu === "audit" && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center text-xs">
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