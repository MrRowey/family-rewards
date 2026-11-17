"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Gift, RotateCcw, X, Eye, EyeOff, Users2 } from "lucide-react";

import { fetchParentPortalData } from "@/features/admin/api";
import { ParentSidebar } from "@/features/admin/ParentSidebar";
import { AdminInfoSections } from "@/features/admin/AdminInfoSections";
import { AdminSettingsSections } from "@/features/admin/AdminSettingsSections";
import { ApprovalSections } from "@/features/approvals/ApprovalSections";
import { TaskManagementSections } from "@/features/tasks/TaskManagementSections";
import { ShopManagementSections } from "@/features/rewards/ShopManagementSections";
import type { NavigationMenu, SidebarCategory, ChildProfile, TaskItem, TaskAssignmentItem, RewardItem, TaskCompletionRecord, RewardRedemptionRecord, AuditLogRecord, KioskConfig } from "@/features/admin/types";

export default function ParentDashboard() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<NavigationMenu>("task_approvals");

  // Collapsible categories state - start with approvals and vault open
  const [collapsedCategories, setCollapsedCategories] = useState<Record<SidebarCategory, boolean>>({
    approvals: false,
    vault: false,
    shop: true,
    users: true,
    admin: true,
  });

  const toggleCategory = (cat: SidebarCategory) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Core Data
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignmentItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskCompletionRecord[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<RewardRedemptionRecord[]>([]);
  const [redemptionsHistory, setRedemptionsHistory] = useState<RewardRedemptionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [kioskConfig, setKioskConfig] = useState<KioskConfig>({ idleTimeoutSec: 45, soundEffects: true, maxDailyTasks: 5 });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Forms: Task Creation
  const [taskTitle, setTaskTitle] = useState("");
  const [taskIcon, setTaskIcon] = useState("⭐");
  const [taskStarValue, setTaskStarValue] = useState(1);
  const [taskSubSteps, setTaskSubSteps] = useState<string[]>([""]);

  // Forms: Scheduler
  const [schedChildId, setSchedChildId] = useState("");
  const [schedTaskId, setSchedTaskId] = useState("");
  const [schedDay, setSchedDay] = useState(1);
  const [schedInterval, setSchedInterval] = useState(1);

  // Forms: Shop Item Creation
  const [shopTitle, setShopTitle] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  const [shopIcon, setShopIcon] = useState("🎁");
  const [shopCost, setShopCost] = useState(5);
  const [shopStock, setShopStock] = useState(2);
  const [shopIsGroup, setShopIsGroup] = useState(false);

  // Forms: Child Creation
  const [childName, setChildName] = useState("");
  const [childAvatar, setChildAvatar] = useState("🦁");
  const [childDob, setChildDob] = useState("");

  // Forms: Star Adjustment
  const [adjustChildId, setAdjustChildId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState<string>("1");
  const [adjustReason, setAdjustReason] = useState("");

  // Forms: PIN Reset
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const loadPortalData = useCallback(async () => {
    const data = await fetchParentPortalData(selectedMonth);
    if (data.children) {
      setChildren(data.children);
      if (data.children.length > 0) {
        setAdjustChildId((prev) => prev || data.children![0].id);
        setSchedChildId((prev) => prev || data.children![0].id);
      }
    }
    if (data.tasks) setTasks(data.tasks);
    if (data.rewards) setRewards(data.rewards);
    if (data.assignments) setAssignments(data.assignments);
    if (data.pendingTasks) setPendingTasks(data.pendingTasks);
    if (data.pendingRedemptions) setPendingRedemptions(data.pendingRedemptions);
    if (data.redemptionsHistory) setRedemptionsHistory(data.redemptionsHistory);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    if (data.kioskConfig) setKioskConfig(data.kioskConfig);
  }, [selectedMonth]);

  useEffect(() => {
    let isCancelled = false;
    async function init() {
      if (!isCancelled) await loadPortalData();
    }
    init();
    return () => {
      isCancelled = true;
    };
  }, [loadPortalData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
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

  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedChildId || !schedTaskId) return;
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: schedChildId,
        taskId: schedTaskId,
        dayOfWeek: schedDay,
        repeatInterval: schedInterval,
      }),
    });
    loadPortalData();
  };

  const handleDeleteAssignment = async (id: string) => {
    await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
    loadPortalData();
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: shopTitle,
        description: shopDesc,
        icon: shopIcon,
        starCost: shopCost,
        monthlyStock: shopStock,
        isGroup: shopIsGroup,
      }),
    });
    setShopTitle("");
    setShopDesc("");
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

  const handleRefund = async (redemptionId: string) => {
    if (!confirm("Refund stars back to child?")) return;
    await fetch("/api/redemptions/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId }),
    });
    loadPortalData();
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

  const handleAdjustStars = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetChildId = adjustChildId || children[0]?.id;
    if (!targetChildId || !adjustReason) {
      alert("Please select a Child and enter a reason.");
      return;
    }

    try {
      const res = await fetch("/api/children/adjust-stars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: targetChildId,
        amount: adjustAmount,
        reason: adjustReason
        }),
      });

      if (res.ok) {
        alert("Start Balance updated Successfully!");
        setAdjustReason("");
        setAdjustAmount("1");
        await loadPortalData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to adjust Balance");
      }
    } catch {
      alert("Network Error adjusting starts.");
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      alert("PINs do not match!");
      return;
    }
    const res = await fetch("/api/parent/pin-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPin }),
    });
    if (res.ok) {
      alert("Parent PIN updated. Please sign in again.");
      setNewPin("");
      setConfirmPin("");
      router.replace("/");
    } else {
      alert("Failed to update PIN");
    }
  };

  const handleSaveKioskConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/config/kiosk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kioskConfig),
    });
    alert("Kiosk settings saved!");
    loadPortalData();
  };

  const totalPending = pendingTasks.length + pendingRedemptions.length;

  return (
    <div className="flex h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans select-none touch-manipulation">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 right-1/4 w-[600px] h-[350px] bg-indigo-600/10 blur-[150px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 left-10 w-[500px] h-[300px] bg-violet-600/10 blur-[140px] rounded-full" />

      {/* SIDEBAR NAVIGATION */}
      <ParentSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} collapsedCategories={collapsedCategories} toggleCategory={toggleCategory} pendingTasksCount={pendingTasks.length} pendingRedemptionsCount={pendingRedemptions.length} totalPending={totalPending} loadPortalData={loadPortalData} handleLogout={handleLogout} />

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-16 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl px-8 flex items-center justify-between">
          <h2 className="font-black text-lg text-white capitalize tracking-tight">
            {activeMenu.replace(/_/g, " ")}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          <ApprovalSections activeMenu={activeMenu} pendingTasks={pendingTasks} pendingRedemptions={pendingRedemptions} handleTaskApproval={handleTaskApproval} handleShopApproval={handleShopApproval} />
          <TaskManagementSections activeMenu={activeMenu} tasks={tasks} householdChildren={children} assignments={assignments} taskTitle={taskTitle} setTaskTitle={setTaskTitle} taskIcon={taskIcon} setTaskIcon={setTaskIcon} taskStarValue={taskStarValue} setTaskStarValue={setTaskStarValue} taskSubSteps={taskSubSteps} setTaskSubSteps={setTaskSubSteps} schedChildId={schedChildId} setSchedChildId={setSchedChildId} schedTaskId={schedTaskId} setSchedTaskId={setSchedTaskId} schedDay={schedDay} setSchedDay={setSchedDay} schedInterval={schedInterval} setSchedInterval={setSchedInterval} handleCreateTask={handleCreateTask} handleScheduleTask={handleScheduleTask} handleDeleteAssignment={handleDeleteAssignment} />
          <ShopManagementSections activeMenu={activeMenu} householdChildren={children} rewards={rewards} assignments={assignments} redemptionsHistory={redemptionsHistory} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} shopTitle={shopTitle} setShopTitle={setShopTitle} shopDesc={shopDesc} setShopDesc={setShopDesc} shopIcon={shopIcon} setShopIcon={setShopIcon} shopCost={shopCost} setShopCost={setShopCost} shopStock={shopStock} setShopStock={setShopStock} setShopIsGroup={setShopIsGroup} handleCreateReward={handleCreateReward} toggleRewardVisibility={toggleRewardVisibility} handleRefund={handleRefund} />
          {/* 9. CHILD PROFILES */}
          {activeMenu === "user_children" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleCreateChild} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl h-fit">
                <h3 className="text-base font-black text-white">Add Child Profile</h3>
                <div>
                  <label htmlFor="a11y-parent-page-tsx-16" className="block text-xs font-bold text-slate-400 mb-1">Name</label>
                  <input id="a11y-parent-page-tsx-16"
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    required
                    placeholder="Full name"
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="a11y-parent-page-tsx-17" className="block text-xs font-bold text-slate-400 mb-1">Avatar Emoji</label>
                  <input id="a11y-parent-page-tsx-17"
                    type="text"
                    value={childAvatar}
                    onChange={(e) => setChildAvatar(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center text-xl"
                  />
                </div>
                <div>
                  <label htmlFor="a11y-parent-page-tsx-18" className="block text-xs font-bold text-slate-400 mb-1">Date of Birth</label>
                  <input id="a11y-parent-page-tsx-18"
                    type="date"
                    value={childDob}
                    onChange={(e) => setChildDob(e.target.value)}
                    required
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 font-black py-3 rounded-2xl text-xs text-white shadow-lg shadow-indigo-600/30 transition min-h-[46px]"
                >
                  Save Child Profile
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Registered Profiles ({children.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {children.map((child) => (
                    <div key={child.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between shadow-xl">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{child.avatar}</span>
                        <div>
                          <h4 className="font-black text-base text-white">{child.name}</h4>
                          <p className="text-xs text-amber-300 font-black mt-0.5">⭐ {child.stars} Stars</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. BALANCE ADJUSTMENT */}
          {activeMenu === "user_adjust" && (
            <div className="max-w-xl bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl">
              <div>
                <h3 className="font-black text-xl text-white">Manual Star Adjustment</h3>
                <p className="text-xs text-slate-400 mt-1">Directly grant or deduct stars with an audit trail</p>
              </div>

              <form onSubmit={handleAdjustStars} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="a11y-parent-page-tsx-19" className="block text-slate-400 font-bold mb-1">Select Child</label>
                  <select id="a11y-parent-page-tsx-19"
                    value={adjustChildId}
                    onChange={(e) => setAdjustChildId(e.target.value)}
                    required
                    className="w-full bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl text-white"
                  >
                    <option value="">-- Choose Child --</option>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.avatar} {c.name} ({c.stars} ⭐ currently)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-20" className="block text-slate-400 font-bold mb-1">
                    Amount to Adjust (e.g. +5 or -3)
                  </label>
                  <input id="a11y-parent-page-tsx-20"
                    type="text"
                    inputMode="numeric"
                    value={adjustAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow only numbers, an optional leading '-' or '+'
                      if (/^-?\d*$/.test(val) || /^\+?\d*$/.test(val)) {
                        setAdjustAmount(val);
                      }
                    }}
                    required
                    placeholder="-2 or 5"
                    className="w-full bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl text-white font-bold"
                  />
                </div>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-21" className="block text-slate-400 font-bold mb-1">Audit Reason (Required)</label>
                  <input id="a11y-parent-page-tsx-21"
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                    placeholder="e.g. Bonus for helping grandma, or star correction"
                    className="w-full bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 font-black rounded-2xl text-slate-950 shadow-lg shadow-amber-500/20 transition min-h-[48px]"
                >
                  Apply Star Adjustment
                </button>
              </form>
            </div>
          )}

          <AdminSettingsSections activeMenu={activeMenu} newPin={newPin} setNewPin={setNewPin} confirmPin={confirmPin} setConfirmPin={setConfirmPin} kioskConfig={kioskConfig} setKioskConfig={setKioskConfig} handleResetPin={handleResetPin} handleSaveKioskConfig={handleSaveKioskConfig} />
          <AdminInfoSections activeMenu={activeMenu} householdChildren={children} tasks={tasks} redemptionsHistory={redemptionsHistory} auditLogs={auditLogs} />
        </main>
      </div>
    </div>
  );
}