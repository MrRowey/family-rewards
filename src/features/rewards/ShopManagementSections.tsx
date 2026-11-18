"use client";

import { CreateDialog } from "@/features/admin/CreateDialog";
import { groupByCategory } from "@/features/admin/groupByCategory";
import Image from "next/image";
import { useState } from "react";
import type React from "react";
import { RotateCcw, Eye, EyeOff } from "lucide-react";
import type { NavigationMenu, ChildProfile, RewardItem, TaskAssignmentItem, RewardRedemptionRecord } from "@/features/admin/types";

interface ShopManagementSectionsProps {
  activeMenu: NavigationMenu;
  householdChildren: ChildProfile[];
  rewards: RewardItem[];
  inventoryLoadFailed: boolean;
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
  handleCreateReward: (event: React.FormEvent, isGroup: boolean) => Promise<void>;
  rewardSaving: boolean;
  rewardSaveMessage: string | null;
  toggleRewardVisibility: (rewardId: string, childId: string, assigned: boolean) => Promise<void>;
  handleRefund: (id: string) => Promise<void>;
}

export function ShopManagementSections({ activeMenu, householdChildren, rewards, inventoryLoadFailed, redemptionsHistory, selectedMonth, setSelectedMonth, shopTitle, setShopTitle, shopDesc, setShopDesc, shopIcon, setShopIcon, shopCost, setShopCost, shopStock, setShopStock, handleCreateReward, rewardSaving, rewardSaveMessage, toggleRewardVisibility, handleRefund }: ShopManagementSectionsProps) {
  const [costDescending, setCostDescending] = useState(false);
  const orderedRewards = rewards.toSorted((a, b) => costDescending ? b.starCost - a.starCost : a.starCost - b.starCost);
  const shopPrizes = orderedRewards.filter((reward) => !reward.isGroup);
  const [visibilityUpdates, setVisibilityUpdates] = useState<Record<string, boolean>>({});
  const [visibilityPending, setVisibilityPending] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  async function updateVisibility(id: string, isVisible: boolean) {
    if (visibilityPending) return;
    setVisibilityPending(id);
    setVisibilityError(null);
    try {
      const response = await fetch("/api/parent/rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isVisible }),
      });
      if (!response.ok) throw new Error("Unable to update prize visibility.");
      setVisibilityUpdates((previous) => ({ ...previous, [id]: isVisible }));
    } catch {
      setVisibilityError("Unable to update prize visibility. Try again.");
    } finally {
      setVisibilityPending(null);
    }
  }

  return <>
{/* 5. SHOP ITEMS CREATION */}
          {activeMenu === "shop_items" && (
            <div className="space-y-5">
              <CreateDialog label="Add Prize">
              <form onSubmit={(event) => handleCreateReward(event, false)} className="space-y-4">

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

                <label className="block space-y-1 text-sm text-slate-300">
                  <span>Category (optional)</span>
                  <input name="category" maxLength={60} className="block w-full rounded-lg border border-slate-700 bg-slate-950 p-2" />
                </label>
                <label className="block space-y-1 text-sm text-slate-300">
                  <span>Photo (optional)</span>
                  <input type="file" name="photo" accept="image/png,image/jpeg,image/webp"
                    className="block w-full rounded-lg border border-slate-700 p-2 text-sm" />
                  <span className="block text-xs text-slate-400">PNG, JPEG or WebP, up to 2 MB.</span>
                </label>
                <output className="block text-sm text-amber-200">{rewardSaveMessage}</output>
                <button
                  type="submit"
                  disabled={rewardSaving}
                  className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 font-black py-3 rounded-2xl text-xs text-slate-950 shadow-lg shadow-amber-500/20 transition min-h-[46px]"
                >
                  {rewardSaving ? "Saving..." : "Save Prize to Shop"}
                </button>
              </form>
              </CreateDialog>
              <label className="ml-4 inline-flex items-center gap-2 text-sm">Star cost
                <select className="min-h-11 rounded-lg bg-slate-900 px-3" value={String(costDescending)} onChange={(event) => setCostDescending(event.target.value === "true")}>
                  <option value="false">Lowest first</option>
                  <option value="true">Highest first</option>
                </select>
              </label>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Shop Inventory ({shopPrizes.length})</h3>
                {inventoryLoadFailed && <p role="alert">Could not load prizes. Select Refresh Data to retry.</p>}
                {!inventoryLoadFailed && shopPrizes.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-300">Save your first prize to start stocking the shop.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupByCategory(shopPrizes).map(([category, entries]) => (
                <div className="contents" key={category}>
                  <h4 className="col-span-full text-sm font-semibold text-slate-300">{category}</h4>
                  {entries.map((rw) => {
                    const visible = visibilityUpdates[rw.id] ?? rw.isVisible;
                    return (
                      <div key={rw.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-5 rounded-3xl space-y-2 shadow-lg">
                        <div className="flex justify-between items-start">
                          {rw.imageURL ? (
                          <Image src={rw.imageURL} alt="" width={96} height={72} unoptimized className="h-[72px] w-24 rounded-lg object-cover" />
                        ) : <span className="text-4xl">{rw.icon}</span>}
                          <span className="text-xs font-black bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full">
                            ⭐ {rw.starCost}
                          </span>
                        </div>
                        <h4 className="wrap-break-word font-black text-base text-white">{rw.title}</h4>
                        {rw.description && <p className="wrap-break-word text-sm text-slate-300">{rw.description}</p>}
                        <p className={visible ? "text-sm text-emerald-300" : "text-sm text-slate-300"}>
                          {visible ? "Shown in shop" : "Hidden from shop"}
                        </p>
                        <p className="text-xs text-slate-400">{rw.currentStock === 0 ? "Out of stock" : `${rw.currentStock} in stock`} · Monthly stock: {rw.monthlyStock}</p>

                      </div>
                    );
                  })}
                </div>
                ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. GROUP GOALS */}
          {activeMenu === "shop_group" && (
            <div className="space-y-5">
              <CreateDialog label="Add Group Goal">
              <form onSubmit={(event) => handleCreateReward(event, true)} className="space-y-4">
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

                <label className="block space-y-1 text-sm text-slate-300">
                  <span>Category (optional)</span>
                  <input name="category" maxLength={60} className="block w-full rounded-lg border border-slate-700 bg-slate-950 p-2" />
                </label>
                <label className="block space-y-1 text-sm text-slate-300">
                  <span>Photo (optional)</span>
                  <input type="file" name="photo" accept="image/png,image/jpeg,image/webp"
                    className="block w-full rounded-lg border border-slate-700 p-2 text-sm" />
                  <span className="block text-xs text-slate-400">PNG, JPEG or WebP, up to 2 MB.</span>
                </label>
                <output className="block text-sm text-amber-200">{rewardSaveMessage}</output>

                <button
                  type="submit"
                  disabled={rewardSaving}
                  className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 font-black py-3 rounded-2xl text-xs text-white shadow-lg shadow-indigo-600/30 transition min-h-[46px]"
                >
                  Create Group Goal
                </button>
              </form>
              </CreateDialog>
              <label className="ml-4 inline-flex items-center gap-2 text-sm">Star cost
                <select className="min-h-11 rounded-lg bg-slate-900 px-3" value={String(costDescending)} onChange={(event) => setCostDescending(event.target.value === "true")}>
                  <option value="false">Lowest first</option>
                  <option value="true">Highest first</option>
                </select>
              </label>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Family Group Goals ({rewards.filter((r) => r.isGroup).length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupByCategory(orderedRewards.filter((reward) => reward.isGroup)).map(([category, entries]) => (
                <div className="contents" key={category}>
                  <h4 className="col-span-full text-sm font-semibold text-slate-300">{category}</h4>
                  {entries.map((rw) => (
                    <div key={rw.id} className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 p-5 rounded-3xl space-y-2 shadow-lg">
                      <div className="flex justify-between items-start">
                        {rw.imageURL ? (
                          <Image src={rw.imageURL} alt="" width={96} height={72} unoptimized className="h-[72px] w-24 rounded-lg object-cover" />
                        ) : <span className="text-4xl">{rw.icon}</span>}
                        <span className="text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full">
                          Target: {rw.starCost} ⭐
                        </span>
                      </div>
                      <h4 className="font-black text-base text-white">{rw.title}</h4>
                      <p className="text-xs text-slate-400">Cooperative sibling target</p>
                    </div>
                  ))}
                </div>
                ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. SHOP VISIBILITY MATRIX */}
          {activeMenu === "shop_visibility" && (
            <div className="space-y-6">
              <section className="space-y-3 rounded-xl border border-slate-800 p-4">
                <h3 className="font-semibold">Shop visibility</h3>
                <output className="block text-sm text-amber-200">{visibilityError}</output>
                {shopPrizes.map((prize) => {
                  const visible = visibilityUpdates[prize.id] ?? prize.isVisible;
                  return (
                    <div key={prize.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                      <span>{prize.title}</span>
                      <button type="button" disabled={visibilityPending !== null}
                        onClick={() => updateVisibility(prize.id, !visible)}
                        className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm">
                        {visibilityPending === prize.id ? "Saving…" : visible ? "Hide from shop" : "Show in shop"}
                      </button>
                    </div>
                  );
                })}
              </section>
              <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl">
                <div>
                  <h3 className="text-lg font-black text-white">Shop Planner</h3>
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
                    {rewards.filter((reward) => reward.targetMonth === null || reward.targetMonth === selectedMonth).map((reward) => (
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
