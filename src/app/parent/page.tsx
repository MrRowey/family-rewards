"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";


import { fetchParentPortalData } from "@/features/admin/api";
import { ParentSidebar } from "@/features/admin/ParentSidebar";
import { AdminInfoSections } from "@/features/admin/AdminInfoSections";
import { AdminSettingsSections } from "@/features/admin/AdminSettingsSections";
import { ApprovalSections } from "@/features/approvals/ApprovalSections";
import { TaskManagementSections } from "@/features/tasks/TaskManagementSections";
import { ShopManagementSections } from "@/features/rewards/ShopManagementSections";
import { ChildManagementSections } from "@/features/children/ChildManagementSections";
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
  const [kioskConfig, setKioskConfig] = useState<KioskConfig>({ idleTimeoutSec: 45, soundEffects: true, reducedMotion: false, showPickerStars: true, maxDailyTasks: 5 });

  // Forms: Task Creation
  const [taskSaveError, setTaskSaveError] = useState("");
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
  const rewardSaveInFlight = useRef(false);
  const [inventoryLoadFailed, setInventoryLoadFailed] = useState(false);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardSaveMessage, setRewardSaveMessage] = useState<string | null>(null);

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
    const data = await fetchParentPortalData();
    if (data.children) {
      setChildren(data.children);
      if (data.children.length > 0) {
        setAdjustChildId((prev) => prev || data.children![0].id);
        setSchedChildId((prev) => prev || data.children![0].id);
      }
    }
    if (data.tasks) setTasks(data.tasks);
    if (data.rewards) setRewards(data.rewards);
    setInventoryLoadFailed(!data.rewards);
    if (data.assignments) setAssignments(data.assignments);
    if (data.pendingTasks) setPendingTasks(data.pendingTasks);
    if (data.pendingRedemptions) setPendingRedemptions(data.pendingRedemptions);
    if (data.redemptionsHistory) setRedemptionsHistory(data.redemptionsHistory);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    if (data.kioskConfig) setKioskConfig(data.kioskConfig);
  }, []);

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
    await fetch("/api/task-completions", {
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
    const form = e.currentTarget as HTMLFormElement;
    const category = String(new FormData(form).get("category") ?? "");
    const cleanSteps = taskSubSteps.filter((s) => s.trim() !== "");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, category, icon: taskIcon, starValue: taskStarValue, subSteps: cleanSteps }),
    });
    if (!response.ok) {
      setTaskSaveError("Could not save the chore.");
      return;
    }
    setTaskSaveError("");
    form.reset();
    setTaskTitle("");
    setTaskSubSteps([""]);
    loadPortalData();
  };

  const handleScheduleTask = async (taskId: string, dayOfWeek: number) => {
    const response = await fetch("/api/task-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: schedChildId, taskId, dayOfWeek, repeatInterval: schedInterval }),
    });
    if (!response.ok) throw new Error("Could not schedule the chore.");
    await loadPortalData();
  };

  const handleDeleteAssignment = async (id: string) => {
    const response = await fetch(`/api/task-assignments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not remove the chore.");
    await loadPortalData();
  };

  const handleCreateReward = async (e: React.FormEvent, isGroup: boolean) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fields = new FormData(form);
    const photo = fields.get("photo");
    const category = String(fields.get("category") ?? "");
    if (rewardSaveInFlight.current) return;
    rewardSaveInFlight.current = true;
    setRewardSaveMessage(null);
    setRewardSaving(true);
    try {
      let imageURL: string | undefined;
      if (photo instanceof File && photo.size > 0) {
        const data = new FormData();
        data.set("file", photo);
        const upload = await fetch("/api/upload", { method: "POST", body: data });
        const result = await upload.json();
        if (!upload.ok) throw new Error(result.error || "Unable to upload photo.");
        imageURL = result.imageUrl;
      }
      const response = await fetch("/api/parent/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: shopTitle, description: shopDesc, icon: shopIcon,
          starCost: shopCost, monthlyStock: shopStock, isGroup, imageURL, category }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Unable to save prize (HTTP ${response.status})`);
      }
      form.reset();
      setShopTitle("");
      setShopDesc("");
      setRewardSaveMessage("Prize saved successfully.");
      await loadPortalData();
    } catch (error) {
      setRewardSaveMessage(error instanceof Error ? error.message : "Unable to save prize.");
    } finally {
      rewardSaveInFlight.current = false;
      setRewardSaving(false);
    }
  };

  const handleRefund = async (redemptionId: string, decision: "APPROVE" | "DECLINE") => {
    const response = await fetch("/api/redemptions/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId, decision }),
    });
    if (!response.ok) throw new Error("Could not update the refund request.");
    await loadPortalData();
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
      const res = await fetch(`/api/children/${targetChildId}/stars`, {
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
    const res = await fetch("/api/parent/pin", {
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

  const [kioskSaveMessage, setKioskSaveMessage] = useState("");

  const handleSaveKioskConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setKioskSaveMessage("");
    try {
      const response = await fetch("/api/kiosk/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kioskConfig),
      });
      if (!response.ok) throw new Error();
      setKioskSaveMessage("Kiosk settings saved.");
    } catch {
      setKioskSaveMessage("Could not save kiosk settings. Try again.");
    }
  };

  const totalPending = pendingTasks.length + pendingRedemptions.length;

  return (
    <div className="flex h-dvh bg-slate-950 text-slate-100 font-sans">
      {/* SIDEBAR NAVIGATION */}
      <ParentSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} collapsedCategories={collapsedCategories} toggleCategory={toggleCategory} totalPending={totalPending} loadPortalData={loadPortalData} handleLogout={handleLogout} />

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="min-h-16 border-b border-slate-800 bg-slate-900 px-4 sm:px-8 flex items-center justify-between">
          <h2 className="font-semibold text-xl text-white capitalize tracking-tight">
            {({ task_approvals: "Approvals", task_vault: "Chore Library", task_scheduler: "Chore Scheduler", shop_visibility: "Shop Planner" } as Partial<Record<NavigationMenu, string>>)[activeMenu] ?? activeMenu.replace(/_/g, " ")}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {activeMenu === "task_approvals" && <ApprovalSections activeMenu={activeMenu} pendingTasks={pendingTasks} pendingRedemptions={pendingRedemptions} handleTaskApproval={handleTaskApproval} handleShopApproval={handleShopApproval} />}
          <TaskManagementSections activeMenu={activeMenu} tasks={tasks} taskSaveError={taskSaveError} householdChildren={children} assignments={assignments} taskTitle={taskTitle} setTaskTitle={setTaskTitle} taskIcon={taskIcon} setTaskIcon={setTaskIcon} taskStarValue={taskStarValue} setTaskStarValue={setTaskStarValue} taskSubSteps={taskSubSteps} setTaskSubSteps={setTaskSubSteps} schedChildId={schedChildId} setSchedChildId={setSchedChildId} schedTaskId={schedTaskId} setSchedTaskId={setSchedTaskId} schedDay={schedDay} setSchedDay={setSchedDay} schedInterval={schedInterval} setSchedInterval={setSchedInterval} handleCreateTask={handleCreateTask} handleScheduleTask={handleScheduleTask} handleDeleteAssignment={handleDeleteAssignment} />
          <ShopManagementSections activeMenu={activeMenu} householdChildren={children} rewards={rewards} inventoryLoadFailed={inventoryLoadFailed} assignments={assignments} redemptionsHistory={redemptionsHistory} shopTitle={shopTitle} setShopTitle={setShopTitle} shopDesc={shopDesc} setShopDesc={setShopDesc} shopIcon={shopIcon} setShopIcon={setShopIcon} shopCost={shopCost} setShopCost={setShopCost} shopStock={shopStock} setShopStock={setShopStock} handleCreateReward={handleCreateReward} rewardSaving={rewardSaving} rewardSaveMessage={rewardSaveMessage} handleRefund={handleRefund} />
          <ChildManagementSections activeMenu={activeMenu} householdChildren={children} childName={childName} setChildName={setChildName} childAvatar={childAvatar} setChildAvatar={setChildAvatar} childDob={childDob} setChildDob={setChildDob} adjustChildId={adjustChildId} setAdjustChildId={setAdjustChildId} adjustAmount={adjustAmount} setAdjustAmount={setAdjustAmount} adjustReason={adjustReason} setAdjustReason={setAdjustReason} handleCreateChild={handleCreateChild} handleAdjustStars={handleAdjustStars} />
          <AdminSettingsSections activeMenu={activeMenu} newPin={newPin} setNewPin={setNewPin} confirmPin={confirmPin} setConfirmPin={setConfirmPin} kioskConfig={kioskConfig} kioskSaveMessage={kioskSaveMessage} setKioskConfig={setKioskConfig} handleResetPin={handleResetPin} handleSaveKioskConfig={handleSaveKioskConfig} />
          <AdminInfoSections activeMenu={activeMenu} householdChildren={children} tasks={tasks} redemptionsHistory={redemptionsHistory} auditLogs={auditLogs} onRestore={loadPortalData} />
        </main>
      </div>
    </div>
  );
}