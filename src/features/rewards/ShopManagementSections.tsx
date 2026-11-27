"use client";

import { CreateDialog } from "@/features/admin/CreateDialog";
import { groupByCategory } from "@/features/admin/groupByCategory";
import { RewardPhotoPicker } from "./RewardPhotoPicker";
import { EditReward } from "./EditReward";
import { ShopMonthPlanner } from "./ShopMonthPlanner";
import Image from "next/image";
import { useState } from "react";
import type React from "react";
import type { NavigationMenu, ChildProfile, RewardItem, TaskAssignmentItem, RewardRedemptionRecord } from "@/features/admin/types";

interface ShopManagementSectionsProps {
  activeMenu: NavigationMenu;
  householdChildren: ChildProfile[];
  rewards: RewardItem[];
  inventoryLoadFailed: boolean;
  refresh: () => Promise<void>;
  assignments: TaskAssignmentItem[];
  redemptionsHistory: RewardRedemptionRecord[];
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
  handleRefund: (id: string, decision: "APPROVE" | "DECLINE", returnToStock: boolean) => Promise<void>;
}

export function ShopManagementSections({ activeMenu, householdChildren, rewards, inventoryLoadFailed, refresh, redemptionsHistory, shopTitle, setShopTitle, shopDesc, setShopDesc, shopIcon, setShopIcon, shopCost, setShopCost, shopStock, setShopStock, handleCreateReward, rewardSaving, rewardSaveMessage, handleRefund }: ShopManagementSectionsProps) {
  const [skipStock, setSkipStock] = useState<Record<string, boolean>>({});
  const [refundPending, setRefundPending] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");
  const refundHistory = redemptionsHistory.filter((item) => item.status === "REFUNDED" || item.refundState === "DECLINED");
  const refundRequests = redemptionsHistory.filter((item) => item.refundState === "PENDING").toReversed();

  async function reviewRefund(id: string, decision: "APPROVE" | "DECLINE") {
    if (refundPending) return;
    setRefundPending(true);
    setRefundMessage("");
    try {
      await handleRefund(id, decision, !skipStock[id]);
      setRefundMessage(decision === "APPROVE" ? "Refund approved." : "Refund declined.");
    } catch {
      setRefundMessage("Could not update the refund request. Try again.");
    } finally {
      setRefundPending(false);
    }
  }

  const [costDescending, setCostDescending] = useState(false);
  const orderedRewards = rewards.toSorted((a, b) => costDescending ? b.starCost - a.starCost : a.starCost - b.starCost);
  const shopPrizes = orderedRewards.filter((reward) => !reward.isGroup);
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
                <RewardPhotoPicker disabled={rewardSaving} />
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {groupByCategory(shopPrizes).map(([category, entries]) => (
                <div className="contents" key={category}>
                  <h4 className="col-span-full text-sm font-semibold text-slate-300">{category}</h4>
                  {entries.map((rw) => {
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
                      {rw.isArchived && <p className="text-sm text-slate-400">Archived</p>}
                      <EditReward reward={rw} refresh={refresh} />
                        {rw.description && <p className="wrap-break-word text-sm text-slate-300">{rw.description}</p>}
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
                <RewardPhotoPicker disabled={rewardSaving} />
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      {rw.isArchived && <p className="text-sm text-slate-400">Archived</p>}
                      <EditReward reward={rw} refresh={refresh} />
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
              <ShopMonthPlanner profiles={householdChildren} rewards={rewards} />
            </div>
          )}

          {activeMenu === "shop_refunds" && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Pending refund requests</h3>
              <output className="block text-sm text-slate-300">{refundMessage}</output>
              {refundRequests.length === 0 && (
                <p className="rounded-xl border border-slate-800 p-5 text-slate-300">No refund requests to review.</p>
              )}
              {refundRequests.map((request) => (
                <article key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div>
                    <h4 className="font-semibold">{request.reward?.title}</h4>
                    <p className="text-sm text-slate-300">{request.child?.name} · {request.starCostAtClaim ?? request.reward?.starCost} stars</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!skipStock[request.id]} disabled={refundPending}
                        onChange={(event) => setSkipStock({ ...skipStock, [request.id]: !event.target.checked })} />
                      Return to stock
                    </label>
                    <button type="button" disabled={refundPending} onClick={() => reviewRefund(request.id, "APPROVE")}
                      className="min-h-11 rounded-lg bg-emerald-100 px-4 font-semibold text-emerald-950 disabled:opacity-50">Approve</button>
                    <button type="button" disabled={refundPending} onClick={() => reviewRefund(request.id, "DECLINE")}
                      className="min-h-11 rounded-lg border border-slate-700 px-4 font-semibold disabled:opacity-50">Decline</button>
                  </div>
                </article>
              ))}
              <details className="rounded-xl border border-slate-800 p-4">
                <summary className="cursor-pointer font-semibold">Refund history ({refundHistory.length})</summary>
                {refundHistory.length === 0 && <p className="mt-2 text-sm text-slate-300">No completed refund decisions.</p>}
                <ul className="mt-2 divide-y divide-slate-800 text-sm">
                  {refundHistory.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3">
                    <span>{item.reward?.title} · {item.child?.name}</span>
                    <span className="text-slate-300">{item.status === "REFUNDED" ? "Refunded" : "Declined"}</span>
                  </li>)}
                </ul>
              </details>
            </section>
          )}
  </>;
}
