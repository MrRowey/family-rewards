"use client";

import type React from "react";
import { Gift, RotateCcw, Eye, EyeOff, Users2 } from "lucide-react";
import type { NavigationMenu, ChildProfile, RewardItem, TaskAssignmentItem, RewardRedemptionRecord } from "@/features/admin/types";

interface ShopManagementSectionsProps {
  activeMenu: NavigationMenu;
  householdChildren: ChildProfile[];
  rewards: RewardItem[];
  assignments: TaskAssignmentItem[];
  redemptionsHistory: RewardRedemptionRecord[];
  selectedMonth: number;
  setSelectedMonth: (value: number) => void;
  shopTitle: string;
  setShopTitle: (value: string) => void;
  shopDesc: string;
  setShopDesc: (value: string) => void;
  shopIcon: string;
  setShopIcon: (value: string) => void;
  shopCost: number;
  setShopCost: (value: number) => void;
  shopStock: number;
  setShopStock: (value: number) => void;
  setShopIsGroup: (value: boolean) => void;
  handleCreateReward: (event: React.FormEvent) => Promise<void>;
  toggleRewardVisibility: (rewardId: string, childId: string, assigned: boolean) => Promise<void>;
  handleRefund: (id: string) => Promise<void>;
}

export function ShopManagementSections({ activeMenu, householdChildren, rewards, redemptionsHistory, selectedMonth, setSelectedMonth, shopTitle, setShopTitle, shopDesc, setShopDesc, shopIcon, setShopIcon, shopCost, setShopCost, shopStock, setShopStock, setShopIsGroup, handleCreateReward, toggleRewardVisibility, handleRefund }: ShopManagementSectionsProps) {
  return <>
{/* 5. SHOP ITEMS CREATION */}
          {activeMenu === "shop_items" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleCreateReward} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl h-fit">
                <h3 className="text-base font-black flex items-center gap-2 text-white">
                  <Gift className="w-4 h-4 text-amber-400" /> Create Shop Prize
                </h3>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-8" className="block text-xs font-bold text-slate-400 mb-1">Prize Title</label>
                  <input id="a11y-parent-page-tsx-8"
                    type="text"
                    value={shopTitle}
                    onChange={(e) => setShopTitle(e.target.value)}
                    required
                    placeholder="e.g. 30 Mins iPad Time"
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  />
                </div>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-9" className="block text-xs font-bold text-slate-400 mb-1">Description (Optional)</label>
                  <input id="a11y-parent-page-tsx-9"
                    type="text"
                    value={shopDesc}
                    onChange={(e) => setShopDesc(e.target.value)}
                    placeholder="Details about when and how to redeem"
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-10" className="block text-xs font-bold text-slate-400 mb-1">Icon</label>
                    <input id="a11y-parent-page-tsx-10"
                      type="text"
                      value={shopIcon}
                      onChange={(e) => setShopIcon(e.target.value)}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center text-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-11" className="block text-xs font-bold text-slate-400 mb-1">Cost ⭐</label>
                    <input id="a11y-parent-page-tsx-11"
                      type="number"
                      value={shopCost}
                      onChange={(e) => setShopCost(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center font-bold text-amber-300"
                    />
                  </div>
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-12" className="block text-xs font-bold text-slate-400 mb-1">Stock</label>
                    <input id="a11y-parent-page-tsx-12"
                      type="number"
                      value={shopStock}
                      onChange={(e) => setShopStock(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 font-black py-3 rounded-2xl text-xs text-slate-950 shadow-lg shadow-amber-500/20 transition min-h-[46px]"
                >
                  Save Prize to Shop
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Active Shop Inventory ({rewards.filter((r) => !r.isGroup).length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rewards.filter((r) => !r.isGroup).map((rw) => (
                    <div key={rw.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-5 rounded-3xl space-y-2 shadow-lg">
                      <div className="flex justify-between items-start">
                        <span className="text-4xl">{rw.icon}</span>
                        <span className="text-xs font-black bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full">
                          ⭐ {rw.starCost}
                        </span>
                      </div>
                      <h4 className="font-black text-base text-white">{rw.title}</h4>
                      <p className="text-xs text-slate-400">Stock: {rw.currentStock} / {rw.monthlyStock} monthly</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. GROUP GOALS */}
          {activeMenu === "shop_group" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={(e) => { setShopIsGroup(true); handleCreateReward(e); }} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl h-fit">
                <h3 className="text-base font-black flex items-center gap-2 text-white">
                  <Users2 className="w-4 h-4 text-indigo-400" /> Create Collaborative Goal
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Group goals allow siblings to combine their earned stars toward shared experiences (e.g. Water Park, Pizza Party).
                </p>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-13" className="block text-xs font-bold text-slate-400 mb-1">Goal Title</label>
                  <input id="a11y-parent-page-tsx-13"
                    type="text"
                    value={shopTitle}
                    onChange={(e) => setShopTitle(e.target.value)}
                    required
                    placeholder="e.g. Family Movie Night"
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-14" className="block text-xs font-bold text-slate-400 mb-1">Icon</label>
                    <input id="a11y-parent-page-tsx-14"
                      type="text"
                      value={shopIcon}
                      onChange={(e) => setShopIcon(e.target.value)}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center text-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-15" className="block text-xs font-bold text-slate-400 mb-1">Total Stars ⭐</label>
                    <input id="a11y-parent-page-tsx-15"
                      type="number"
                      value={shopCost}
                      onChange={(e) => setShopCost(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center font-bold text-amber-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 font-black py-3 rounded-2xl text-xs text-white shadow-lg shadow-indigo-600/30 transition min-h-[46px]"
                >
                  Create Group Goal
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Family Group Goals ({rewards.filter((r) => r.isGroup).length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rewards.filter((r) => r.isGroup).map((rw) => (
                    <div key={rw.id} className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 p-5 rounded-3xl space-y-2 shadow-lg">
                      <div className="flex justify-between items-start">
                        <span className="text-4xl">{rw.icon}</span>
                        <span className="text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full">
                          Target: {rw.starCost} ⭐
                        </span>
                      </div>
                      <h4 className="font-black text-base text-white">{rw.title}</h4>
                      <p className="text-xs text-slate-400">Cooperative sibling target</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. SHOP VISIBILITY MATRIX */}
          {activeMenu === "shop_visibility" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl">
                <div>
                  <h3 className="text-lg font-black text-white">Monthly Visibility Matrix</h3>
                  <p className="text-xs text-slate-400">Toggle whether each child can view and claim items</p>
                </div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-950/80 border border-white/10 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold"
                >
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="pb-4 font-bold">Reward</th>
                      <th className="pb-4 font-bold">Cost</th>
                      {householdChildren.map((c) => (
                        <th key={c.id} className="pb-4 text-center font-bold">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rewards.map((reward) => (
                      <tr key={reward.id}>
                        <td className="py-4 font-black flex items-center gap-3 text-white text-sm">
                          <span className="text-2xl">{reward.icon}</span>
                          {reward.title}
                        </td>
                        <td className="py-4 text-amber-300 font-black text-sm">{reward.starCost} ⭐</td>
                        {householdChildren.map((child) => {
                          const isAssigned = reward.assignments?.some((a) => a.childId === child.id) ?? false;
                          return (
                            <td key={child.id} className="py-4 text-center">
                              <button
                                onClick={() => toggleRewardVisibility(reward.id, child.id, isAssigned)}
                                className={`p-2.5 rounded-xl border transition min-h-[36px] min-w-[36px] ${
                                  isAssigned
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                    : "bg-slate-950/60 border-white/5 text-slate-500"
                                }`}
                              >
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

          {/* 8. SHOP REFUNDS */}
          {activeMenu === "shop_refunds" && (
            <div className="space-y-4">
              <h3 className="font-black text-lg text-white">Redemption Ledger & Refunds</h3>
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                {redemptionsHistory.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-xs font-semibold">No redemption transactions recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {redemptionsHistory.map((red) => (
                      <div key={red.id} className="bg-slate-950/80 border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <h4 className="font-black text-sm text-white">{red.reward?.title}</h4>
                          <p className="text-slate-400 mt-0.5">
                            Child: <strong className="text-slate-200">{red.child?.name}</strong> • Cost: {red.reward?.starCost} Stars
                          </p>
                        </div>
                        <button
                          onClick={() => handleRefund(red.id)}
                          className="bg-rose-500/10 border border-rose-500/20 text-rose-300 font-black px-4 py-2 rounded-xl hover:bg-rose-500/20 transition flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Refund Stars
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          
  </>;
}
