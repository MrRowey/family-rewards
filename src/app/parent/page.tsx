"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";


import { fetchParentPortalData, fetchParentQueues } from "@/features/admin/api";
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
  const [kioskConfig, setKioskConfig] = useState<KioskConfig>({ idleTimeoutSec: 45, soundEffects: true, reducedMotion: false, largeKioskText: false, showPickerStars: true, maxDailyTasks: 5 });

  // Forms: Task Creation
  const [taskSaveError, setTaskSaveError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskIcon, setTaskIcon] = useState("⭐");
  const [taskStarValue, setTaskStarValue] = useState(1);
  const [taskSubSteps, setTaskSubSteps] = useState<string[]>([""]);

  // Forms: Scheduler
  const [schedChildId, setSchedChildId] = useState("");

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

  const approvalInFlight = useRef(false);
  const queueRevision = useRef(0);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [approvalBusy, setApprovalBusy] = useState(false);

  const portalRevision = useRef(0);
  const loadPortalData = useCallback(async ({ keepSettings = false } = {}) => {
    const portalRequest = ++portalRevision.current;
    const revision = ++queueRevision.current;
    const data = await fetchParentPortalData();
    if (portalRequest !== portalRevision.current) return;
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
    if (revision === queueRevision.current) {
      if (data.pendingTasks) setPendingTasks(data.pendingTasks);
      if (data.pendingRedemptions) setPendingRedemptions(data.pendingRedemptions);
      if (data.redemptionsHistory) setRedemptionsHistory(data.redemptionsHistory);
    }
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    if (!keepSettings && data.kioskConfig) setKioskConfig(data.kioskConfig);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(loadPortalData, 0);
    const timer = window.setInterval(() => {
      if (!document.hidden && !approvalInFlight.current) void loadPortalData({ keepSettings: true });
    }, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [loadPortalData]);

  useEffect(() => {
    let active = true;
    async function refreshQueues() {
      if (document.hidden || approvalInFlight.current) return;
      const revision = ++queueRevision.current;
      const data = await fetchParentQueues();
      if (!active || revision !== queueRevision.current || approvalInFlight.current) return;
      if (data.pendingTasks) setPendingTasks(data.pendingTasks);
      if (data.pendingRedemptions) setPendingRedemptions(data.pendingRedemptions);
      if (data.redemptionsHistory) setRedemptionsHistory(data.redemptionsHistory);
    }
    const timer = window.setInterval(refreshQueues, 10000);
    window.addEventListener("focus", refreshQueues);
    document.addEventListener("visibilitychange", refreshQueues);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshQueues);
      document.removeEventListener("visibilitychange", refreshQueues);
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const decideApproval = async (url: string, method: string, body: Record<string, string>) => {
    if (approvalInFlight.current) return;
    approvalInFlight.current = true;
    queueRevision.current++;
    setApprovalBusy(true);
    setApprovalMessage("");
    try {
      const response = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error();
      setApprovalMessage("Decision saved.");
    } catch {
      setApprovalMessage("Could not save the decision. Try again.");
    } finally {
      await loadPortalData();
      approvalInFlight.current = false;
      setApprovalBusy(false);
    }
  };

  const handleTaskApproval = (completionId: string, action: "APPROVE" | "DECLINE") =>
    decideApproval("/api/task-completions", "PATCH", { completionId, action });

  const handleShopApproval = (redemptionId: string, action: "APPROVE" | "DECLINE") =>
    decideApproval("/api/redemptions/approve", "POST", { redemptionId, action });

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

  const handleScheduleTask = async (taskId: string, dayOfWeek: number, date?: string) => {
    const response = await fetch("/api/task-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: schedChildId, taskId, dayOfWeek, repeatInterval: 1, ...(date && { startDate: date, endDate: date }) }),
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

  const handleRefund = async (redemptionId: string, decision: "APPROVE" | "DECLINE", returnToStock: boolean) => {
    const response = await fetch("/api/redemptions/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId, decision, returnToStock }),
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
    const targetChildId = adjustChildId;
    const amount = Number(adjustAmount);
    if (!targetChildId || !adjustReason.trim() || !Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 100000) {
      alert("Select a child, enter a nonzero whole number up to 100,000, and add a reason.");
      return;
    }

    try {
      const res = await fetch(`/api/children/${targetChildId}/stars`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: targetChildId,
        amount,
        reason: adjustReason
        }),
      });

      if (res.ok) {
        alert("Star balance updated.");
        setAdjustReason("");
        setAdjustAmount("1");
        await loadPortalData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to adjust Balance");
      }
    } catch {
      alert("Could not update the star balance. Try again.");
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
      <ParentSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} collapsedCategories={collapsedCategories} toggleCategory={toggleCategory} totalPending={totalPending} pendingRefunds={redemptionsHistory.filter((item) => item.refundState === "PENDING").length} loadPortalData={loadPortalData} handleLogout={handleLogout} />

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="min-h-16 border-b border-slate-800 bg-slate-900 px-4 sm:px-8 flex items-center justify-between">
          <h2 className="font-semibold text-xl text-white capitalize tracking-tight">
            {({ task_approvals: "Approvals", task_vault: "Chore Library", task_scheduler: "Chore Scheduler", shop_visibility: "Shop Planner", admin_settings: "Settings" } as Partial<Record<NavigationMenu, string>>)[activeMenu] ?? activeMenu.replace(/_/g, " ")}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {activeMenu === "task_approvals" && <ApprovalSections activeMenu={activeMenu} busy={approvalBusy} message={approvalMessage} pendingTasks={pendingTasks} pendingRedemptions={pendingRedemptions} handleTaskApproval={handleTaskApproval} handleShopApproval={handleShopApproval} />}
          <TaskManagementSections activeMenu={activeMenu} tasks={tasks} taskSaveError={taskSaveError} householdChildren={children} assignments={assignments} taskTitle={taskTitle} setTaskTitle={setTaskTitle} taskIcon={taskIcon} setTaskIcon={setTaskIcon} taskStarValue={taskStarValue} setTaskStarValue={setTaskStarValue} taskSubSteps={taskSubSteps} setTaskSubSteps={setTaskSubSteps} schedChildId={schedChildId} setSchedChildId={setSchedChildId} handleCreateTask={handleCreateTask} handleScheduleTask={handleScheduleTask} handleDeleteAssignment={handleDeleteAssignment} />
          <ShopManagementSections activeMenu={activeMenu} householdChildren={children} rewards={rewards} inventoryLoadFailed={inventoryLoadFailed} refresh={loadPortalData} assignments={assignments} redemptionsHistory={redemptionsHistory} shopTitle={shopTitle} setShopTitle={setShopTitle} shopDesc={shopDesc} setShopDesc={setShopDesc} shopIcon={shopIcon} setShopIcon={setShopIcon} shopCost={shopCost} setShopCost={setShopCost} shopStock={shopStock} setShopStock={setShopStock} handleCreateReward={handleCreateReward} rewardSaving={rewardSaving} rewardSaveMessage={rewardSaveMessage} handleRefund={handleRefund} />
          <ChildManagementSections activeMenu={activeMenu} householdChildren={children} childName={childName} setChildName={setChildName} childAvatar={childAvatar} setChildAvatar={setChildAvatar} childDob={childDob} setChildDob={setChildDob} adjustChildId={adjustChildId} setAdjustChildId={setAdjustChildId} adjustAmount={adjustAmount} setAdjustAmount={setAdjustAmount} adjustReason={adjustReason} setAdjustReason={setAdjustReason} handleCreateChild={handleCreateChild} handleAdjustStars={handleAdjustStars} />
          <AdminSettingsSections activeMenu={activeMenu} newPin={newPin} setNewPin={setNewPin} confirmPin={confirmPin} setConfirmPin={setConfirmPin} kioskConfig={kioskConfig} kioskSaveMessage={kioskSaveMessage} setKioskConfig={setKioskConfig} handleResetPin={handleResetPin} handleSaveKioskConfig={handleSaveKioskConfig} />
          <AdminInfoSections activeMenu={activeMenu} householdChildren={children} tasks={tasks} redemptionsHistory={redemptionsHistory} auditLogs={auditLogs} onRestore={loadPortalData} />
        </main>
      </div>
    </div>
  );
}