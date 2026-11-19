"use client";

import { Check, X } from "lucide-react";
import type { NavigationMenu, TaskCompletionRecord, RewardRedemptionRecord } from "@/features/admin/types";

interface ApprovalSectionsProps {
  activeMenu: NavigationMenu;
  busy: boolean;
  message: string;
  pendingTasks: TaskCompletionRecord[];
  pendingRedemptions: RewardRedemptionRecord[];
  handleTaskApproval: (id: string, action: "APPROVE" | "DECLINE") => Promise<void>;
  handleShopApproval: (id: string, action: "APPROVE" | "DECLINE") => Promise<void>;
}

export function ApprovalSections({ activeMenu, busy, message, pendingTasks, pendingRedemptions, handleTaskApproval, handleShopApproval }: ApprovalSectionsProps) {
  if (activeMenu !== "task_approvals") return null;
  return <div className="grid items-start gap-6 xl:grid-cols-2">
          <output className="col-span-full text-sm text-slate-300">{message}</output>
{/* 1. TASK APPROVALS */}
          <section className="min-w-0 space-y-4">
            <h3 className="text-lg font-semibold">Completed Chores</h3>
            <div className="space-y-4">
              {pendingTasks.length === 0 ? (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-16 rounded-3xl text-center text-slate-400 shadow-2xl">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                    ✨
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">No pending chore reviews!</h3>
                  <p className="text-xs text-slate-500 mt-1">All chore submissions have been approved or processed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingTasks.map((comp) => (
                    <div key={comp.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex justify-between items-center shadow-xl">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">{comp.task?.icon}</span>
                        <div>
                          <h3 className="font-black text-lg text-white">{comp.task?.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">Child: <strong className="text-indigo-300">{comp.child?.name}</strong></span>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-300 text-xs font-black">+{comp.task?.starValue} ⭐</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <button type="button" disabled={busy} onClick={() => handleTaskApproval(comp.id, "DECLINE")} className="p-3 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-2xl">
                          <X className="w-5 h-5" />
                        </button>
                        <button type="button" disabled={busy} onClick={() => handleTaskApproval(comp.id, "APPROVE")} className="px-5 py-3 bg-linear-to-r from-emerald-600 to-teal-600 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/30">
                          <Check className="w-4 h-4" /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 2. SHOP APPROVALS */}
          <section className="min-w-0 space-y-4">
            <h3 className="text-lg font-semibold">Shop Redemptions</h3>
            <div className="space-y-4">
              {pendingRedemptions.length === 0 ? (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-16 rounded-3xl text-center text-slate-400 shadow-2xl">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                    🎁
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">No pending shop redemptions!</h3>
                  <p className="text-xs text-slate-500 mt-1">Children haven&apos;t claimed any new prizes requiring review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingRedemptions.map((red) => (
                    <div key={red.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex justify-between items-center shadow-xl">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">{red.reward?.icon}</span>
                        <div>
                          <h3 className="font-black text-lg text-white">{red.reward?.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">Child: <strong className="text-indigo-300">{red.child?.name}</strong></span>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-300 text-xs font-black">Cost: {red.reward?.starCost} ⭐</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <button type="button" disabled={busy} onClick={() => handleShopApproval(red.id, "DECLINE")} className="p-3 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-2xl">
                          <X className="w-5 h-5" />
                        </button>
                        <button type="button" disabled={busy} onClick={() => handleShopApproval(red.id, "APPROVE")} className="px-5 py-3 bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/20">
                          <Check className="w-4 h-4" /> Grant Reward
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          
  </div>;
}
