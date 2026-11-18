"use client";

import AvatarDisplay from "@/components/AvatarDisplay";
import { CreateDialog } from "@/features/admin/CreateDialog";
import type React from "react";

import type { NavigationMenu, ChildProfile } from "@/features/admin/types";

interface ChildManagementSectionsProps {
  activeMenu: NavigationMenu;
  householdChildren: ChildProfile[];
  childName: string;
  setChildName: (value: string) => void;
  childAvatar: string;
  setChildAvatar: (value: string) => void;
  childDob: string;
  setChildDob: (value: string) => void;
  adjustChildId: string;
  setAdjustChildId: (value: string) => void;
  adjustAmount: string;
  setAdjustAmount: (value: string) => void;
  adjustReason: string;
  setAdjustReason: (value: string) => void;
  handleCreateChild: (event: React.FormEvent) => Promise<void>;
  handleAdjustStars: (event: React.FormEvent) => Promise<void>;
}

export function ChildManagementSections({ activeMenu, householdChildren, childName, setChildName, childAvatar, setChildAvatar, childDob, setChildDob, adjustChildId, setAdjustChildId, adjustAmount, setAdjustAmount, adjustReason, setAdjustReason, handleCreateChild, handleAdjustStars }: ChildManagementSectionsProps) {
  const selectedChild = householdChildren.find((child) => child.id === adjustChildId);
  const adjustment = Number(adjustAmount);
  return <>
{/* 9. CHILD PROFILES */}
          {activeMenu === "user_children" && (
            <div className="space-y-5">
              <CreateDialog label="Add Child">
              <form onSubmit={handleCreateChild} className="space-y-4">
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
              </CreateDialog>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Registered Profiles ({householdChildren.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {householdChildren.map((child) => (
                    <div key={child.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between shadow-xl">
                      <div className="flex items-center gap-4">
                        {child.avatarConfig ? (
                          <AvatarDisplay theme={child.avatarTheme} config={child.avatarConfig} seed={child.id} fallbackEmoji={child.avatar} size={48} />
                        ) : <span className="text-4xl">{child.avatar}</span>}
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
                    {householdChildren.map((c) => (
                      <option key={c.id} value={c.id}>{c.avatar} {c.name} ({c.stars} ⭐ currently)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-20" className="block text-slate-400 font-bold mb-1">
                    Stars to add or remove
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

                {selectedChild && (
                  <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm">
                    <div><dt className="text-slate-400">Current balance</dt><dd className="mt-1 font-semibold">{selectedChild.stars} stars</dd></div>
                    <div><dt className="text-slate-400">After adjustment</dt><dd className="mt-1 font-semibold">{Number.isSafeInteger(adjustment) ? Math.max(0, selectedChild.stars + adjustment) : "—"} stars</dd></div>
                  </dl>
                )}
                <button
                  type="submit"
                  disabled={!selectedChild || !Number.isSafeInteger(adjustment) || adjustment === 0 || !adjustReason.trim()}
                  className="w-full py-4 disabled:opacity-50 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 font-black rounded-2xl text-slate-950 shadow-lg shadow-amber-500/20 transition min-h-[48px]"
                >
                  Apply Star Adjustment
                </button>
              </form>
            </div>
          )}

          
  </>;
}
