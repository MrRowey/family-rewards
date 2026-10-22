"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Calendar, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApprovalsTab } from "@/components/parent/ApprovalsTab";
import { PlannerTab } from "@/components/parent/PlannerTab";
import { VaultTab } from "@/components/parent/VaultTab";
import { ShopTab } from "@/components/parent/ShopTab";
import { ChildrenTab } from "@/components/parent/ChildrenTab";
import { Child, Task, Reward, PendingApproval, TaskAssignmentPayload } from "@/types";

export default function ParentDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"approvals" | "planner" | "vault" | "shop" | "children">("approvals");

  const [approvals, setApprovals] = useState<{ pendingTasks: PendingApproval[]; pendingRewards: PendingApproval[] }>({
    pendingTasks: [],
    pendingRewards: [],
  });
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [assignments, setAssignments] = useState<TaskAssignmentPayload[]>([]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const loadAllData = useCallback(async () => {
    try {
      const [appRes, childRes, taskRes, shopRes] = await Promise.all([
        fetch("/api/approvals"),
        fetch("/api/children"),
        fetch("/api/tasks"),
        fetch("/api/rewards"),
      ]);

      if (appRes.ok) setApprovals(await appRes.json());
      if (childRes.ok) {
        const chData: Child[] = await childRes.json();
        setChildren(chData);
        setSelectedChildId((prev) => (prev ? prev : chData[0]?.id || ""));
      }
      if (taskRes.ok) setTasks(await taskRes.json());
      if (shopRes.ok) setRewards(await shopRes.json());
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }, []);

  const loadAssignments = useCallback(async (childId: string) => {
    if (!childId) return;
    try {
      const res = await fetch(`/api/assignments?childId=${childId}`);
      if (res.ok) setAssignments(await res.json());
    } catch (error) {
      console.error("Failed to load assignments:", error);
    }
  }, []);

  // Initial dashboard data load
  useEffect(() => {
    let isSubscribed = true;

    async function fetchDashboardData() {
      try {
        const [appRes, childRes, taskRes, shopRes] = await Promise.all([
          fetch("/api/approvals"),
          fetch("/api/children"),
          fetch("/api/tasks"),
          fetch("/api/rewards"),
        ]);

        if (!isSubscribed) return;

        if (appRes.ok) setApprovals(await appRes.json());
        if (childRes.ok) {
          const chData: Child[] = await childRes.json();
          setChildren(chData);
          setSelectedChildId((prev) => (prev ? prev : chData[0]?.id || ""));
        }
        if (taskRes.ok) setTasks(await taskRes.json());
        if (shopRes.ok) setRewards(await shopRes.json());
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    }

    fetchDashboardData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Sync assignments when selectedChildId changes
  useEffect(() => {
    if (!selectedChildId) return;

    let isSubscribed = true;

    async function fetchAssignments() {
      try {
        const res = await fetch(`/api/assignments?childId=${selectedChildId}`);
        if (res.ok && isSubscribed) {
          setAssignments(await res.json());
        }
      } catch (error) {
        console.error("Assignments fetch error:", error);
      }
    }

    fetchAssignments();

    return () => {
      isSubscribed = false;
    };
  }, [selectedChildId]);

  const handleToggleAssignment = async (taskId: string, dayOfWeek: number) => {
    if (!selectedChildId) return;
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: selectedChildId, taskId, dayOfWeek }),
    });
    if (res.ok) loadAssignments(selectedChildId);
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
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    const res = await fetch(`/api/children?id=${id}`, { method: "DELETE" });
    if (res.ok) loadAllData();
  };

  const handleCreateTask = async (taskData: { title: string; starValue: number; icon: string }) => {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskData, minAge: 2, maxAge: 18 }),
    });
    loadAllData();
  };

  const handleCreateReward = async (rewardData: Partial<Reward>) => {
    await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rewardData),
    });
    loadAllData();
  };

  const handleAssignReward = async (rewardId: string, childId: string) => {
    await fetch("/api/rewards/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardId, childId }),
    });
    loadAllData();
  };

  const handleAddChild = async (childData: { name: string; dob: string; avatar: string }) => {
    await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(childData),
    });
    loadAllData();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans select-none">
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition min-h-12 min-w-12 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2">
              <Shield className="w-8 h-8 text-indigo-400" /> Parent Portal
            </h1>
            <p className="text-xs text-slate-400">Review task submissions, manage vault, and configure reward shop</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl gap-1">
            <Button
              variant={activeTab === "approvals" ? "primary" : "ghost"}
              onClick={() => setActiveTab("approvals")}
            >
              Approvals
              {(approvals.pendingTasks.length > 0 || approvals.pendingRewards.length > 0) && (
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {approvals.pendingTasks.length + approvals.pendingRewards.length}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === "planner" ? "primary" : "ghost"}
              onClick={() => setActiveTab("planner")}
            >
              <Calendar className="w-4 h-4" /> Weekly Planner
            </Button>
            <Button
              variant={activeTab === "vault" ? "primary" : "ghost"}
              onClick={() => setActiveTab("vault")}
            >
              Task Vault ({tasks.length})
            </Button>
            <Button
              variant={activeTab === "shop" ? "primary" : "ghost"}
              onClick={() => setActiveTab("shop")}
            >
              Reward Shop ({rewards.length})
            </Button>
            <Button
              variant={activeTab === "children" ? "primary" : "ghost"}
              onClick={() => setActiveTab("children")}
            >
              Children ({children.length})
            </Button>
          </div>

          <Button variant="danger" onClick={handleLogout} title="Log Out">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {activeTab === "approvals" && <ApprovalsTab approvals={approvals} onProcess={handleProcessApproval} />}
      {activeTab === "planner" && (
        <PlannerTab
          childrenList={children}
          tasks={tasks}
          assignments={assignments}
          selectedChildId={selectedChildId}
          onSelectChild={setSelectedChildId}
          onToggleAssignment={handleToggleAssignment}
        />
      )}
      {activeTab === "vault" && <VaultTab tasks={tasks} onCreateTask={handleCreateTask} />}
      {activeTab === "shop" && (
        <ShopTab
          rewards={rewards}
          childrenList={children}
          onCreateReward={handleCreateReward}
          onAssignReward={handleAssignReward}
        />
      )}
      {activeTab === "children" && (
        <ChildrenTab
          childrenList={children}
          onAddChild={handleAddChild}
          onDeleteChild={handleDeleteChild}
        />
      )}
    </main>
  );
}