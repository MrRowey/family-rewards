"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, ShoppingBag, Sparkles, Clock, Star, Package } from "lucide-react";
import confetti from "canvas-confetti";
import { calculateAgeProfile } from "@/lib/ageRules";
import { Child, Reward, RewardAssignment, PendingApproval } from "@/types";
import { sounds } from "@/lib/sound";

export default function RewardShop() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingApproval[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadShopData = useCallback(async () => {
    try {
      const [rwRes, chRes, appRes] = await Promise.all([
        fetch("/api/rewards"),
        fetch("/api/children"),
        fetch("/api/approvals"),
      ]);

      if (rwRes.ok) setRewards(await rwRes.json());

      if (chRes.ok) {
        const chData: Child[] = await chRes.json();
        setChildren(chData);
        setSelectedChildId((prev) => (prev ? prev : chData[0]?.id || ""));
      }

      if (appRes.ok) {
        const appData = await appRes.json();
        setPendingRedemptions(appData.pendingRewards || []);
      }
    } catch (err) {
      console.error("Failed to load shop data:", err);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    async function fetchData() {
      if (isSubscribed) await loadShopData();
    }
    fetchData();
    return () => {
      isSubscribed = false;
    };
  }, [loadShopData]);

  const activeChild = children.find((c) => c.id === selectedChildId);
  const activeChildAge = activeChild?.dob
    ? calculateAgeProfile(new Date(activeChild.dob)).ageYears
    : 0;

  const visibleRewards = rewards.filter((reward) => {
    if (reward.currentStock <= 0) return false;
    if (activeChildAge < reward.minAge || activeChildAge > reward.maxAge) return false;
    if (reward.assignments && reward.assignments.length > 0) {
      return reward.assignments.some((a: RewardAssignment) => a.childId === selectedChildId);
    }
    return true;
  });

  const childStars = activeChild?.stars || 0;
  const affordableRewards = visibleRewards.filter((r) => childStars >= r.starCost);
  const lockedRewards = visibleRewards.filter((r) => childStars < r.starCost);

  const handleClaimReward = async (e: React.MouseEvent, rewardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedChildId) return;

    setSubmittingId(rewardId);

    try {
      const res = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChildId, rewardId }),
      });

      const data = await res.json();

      if (res.ok) {
        sounds.playFanfare();
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
        });
        await loadShopData();
      } else {
        sounds.playLockedBuzz();
        alert(data.error || "Could not claim reward.");
      }
    } catch (err) {
      console.error("Claim error:", err);
      sounds.playLockedBuzz();
      alert("Network error processing claim.");
    } finally {
      setSubmittingId(null);
    }
  };

  const getRewardImage = (reward: Reward) => {
    const raw = reward as unknown as Record<string, unknown>;
    return (raw.imageUrl as string | undefined) || (raw.imageURL as string | undefined) || null;
  };

  const getRewardDesc = (reward: Reward) => {
    const raw = reward as unknown as Record<string, unknown>;
    return (raw.description as string | undefined) || null;
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 p-4 sm:p-8 select-none touch-manipulation flex flex-col lg:flex-row gap-6">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 right-1/4 w-[600px] h-[350px] bg-amber-500/10 blur-[150px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 left-10 w-[500px] h-[300px] bg-indigo-600/15 blur-[140px] rounded-full" />

      {/* Left-Hand Sidebar: Child Card & Profile Switcher */}
      <aside className="relative z-10 w-full lg:w-80 shrink-0 flex flex-col justify-between bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          {/* Top back button & shop title */}
          <div className="w-full flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <Link
              href="/"
              className="p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-2xl transition active:scale-95 min-h-[48px] min-w-[48px] flex items-center justify-center shadow-md"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-6 h-6 text-slate-200" />
            </Link>
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" /> Kiosk Store
            </span>
          </div>

          {/* Child Big Avatar */}
          <div className="relative mb-5">
            {activeChild?.avatar && activeChild.avatar.startsWith("/") ? (
              <div className="w-32 h-32 rounded-3xl overflow-hidden ring-4 ring-indigo-500/30 shadow-2xl shadow-indigo-500/20">
                <Image
                  src={activeChild.avatar}
                  alt={activeChild.name}
                  width={128}
                  height={128}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-7xl shadow-2xl shadow-indigo-500/10">
                {activeChild?.avatar || "👤"}
              </div>
            )}
          </div>

          {/* Child Name */}
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">
            {activeChild?.name || "Shopper"}
          </h2>

          {/* Big Star Balance Badge */}
          <div className="w-full bg-linear-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/30 p-4 rounded-2xl shadow-inner flex flex-col items-center mb-6">
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300/80 mb-1">
              Your Star Balance
            </span>
            <div className="flex items-center gap-2.5">
              <Star className="w-7 h-7 text-amber-400 fill-amber-400 animate-pulse" />
              <span className="text-4xl font-black text-amber-300">{childStars}</span>
            </div>
          </div>
        </div>

        {/* Quick Sibling Switcher */}
        <div className="pt-4 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 mb-2.5 text-center">
            Switch Shopper
          </p>
          <div className="grid grid-cols-2 gap-2">
            {children.map((c) => {
              const isActive = selectedChildId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                   setSelectedChildId(c.id)
                  }}
                  className={`p-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 min-h-[48px] active:scale-95 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-transparent"
                  }`}
                >
                  <span className="text-base">{c.avatar}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Right Area: Storefront Shelves */}
      <section className="relative z-10 flex-1 overflow-y-auto space-y-8 pr-1">
        {visibleRewards.length === 0 ? (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-2xl mt-12">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-5 text-4xl">
              🎁
            </div>
            <h2 className="text-2xl font-black text-white">The Store is Empty</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              No rewards are currently in stock for {activeChild?.name || "this profile"}. Check back soon or visit Parent Mode to restock!
            </p>
          </div>
        ) : (
          <>
            {/* Shelf 1: Available Now (Can Afford) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-2.5 text-white">
                  <Sparkles className="w-6 h-6 text-amber-400" /> Ready to Redeem
                </h3>
                <span className="text-xs font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full">
                  {affordableRewards.length} Available
                </span>
              </div>

              {affordableRewards.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8 text-center text-sm text-slate-400">
                  Keep earning stars to unlock items on the shelves below! ⭐
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {affordableRewards.map((reward) => {
                    const img = getRewardImage(reward);
                    const desc = getRewardDesc(reward);
                    const isPending = pendingRedemptions.some(
                      (pr) => pr.child?.id === selectedChildId && pr.reward?.id === reward.id
                    );
                    const isSubmitting = submittingId === reward.id;

                    return (
                      <div
                        key={reward.id}
                        className={`rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all duration-300 border ${
                          isPending
                            ? "bg-amber-950/20 border-amber-500/40"
                            : "bg-slate-900/80 border-white/10 hover:border-amber-400/50 hover:-translate-y-1"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="relative">
                              {img ? (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-lg">
                                  <Image
                                    src={img}
                                    alt={reward.title}
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="text-5xl filter drop-shadow-md">{reward.icon}</span>
                              )}
                            </div>

                            <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full font-black text-sm shadow-inner">
                              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                              {reward.starCost}
                            </div>
                          </div>

                          <h4 className="text-xl font-black text-white tracking-tight mb-1">
                            {reward.title}
                          </h4>

                          {desc && (
                            <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                              {desc}
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4 font-semibold">
                            <Package className="w-3 h-3 text-slate-500" />
                            <span>
                              Stock: <strong className="text-slate-200">{reward.currentStock} left</strong>
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/5">
                          {isPending ? (
                            <div className="w-full min-h-[46px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2">
                              <Clock className="w-4 h-4 text-amber-400 animate-pulse" /> Pending Approval
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={(e) => handleClaimReward(e, reward.id)}
                              className="w-full min-h-[48px] bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer text-sm"
                            >
                              <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
                              {isSubmitting ? "Submitting..." : "Redeem Prize"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shelf 2: Goal Vault (Locked / Need More Stars) */}
            {lockedRewards.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2 text-slate-300">
                    <Lock className="w-5 h-5 text-slate-400" /> Goal Vault (Need More Stars)
                  </h3>
                  <span className="text-xs font-extrabold bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700/50">
                    {lockedRewards.length} Locked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {lockedRewards.map((reward) => {
                    const img = getRewardImage(reward);
                    const desc = getRewardDesc(reward);
                    const deficit = reward.starCost - childStars;
                    const progress = Math.min(100, Math.round((childStars / reward.starCost) * 100));

                    return (
                      <div
                        key={reward.id}
                        onClick={() => sounds.playLockedBuzz()}
                        className="rounded-3xl p-5 bg-slate-900/40 border border-slate-800/80 shadow-lg backdrop-blur-md flex flex-col justify-between opacity-70 hover:opacity-90 transition-opacity"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="relative grayscale opacity-80">
                              {img ? (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/5">
                                  <Image
                                    src={img}
                                    alt={reward.title}
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="text-5xl">{reward.icon}</span>
                              )}
                            </div>

                            <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 text-slate-300 px-3 py-1 rounded-full font-black text-sm">
                              <Star className="w-3.5 h-3.5 text-slate-400" />
                              {reward.starCost}
                            </div>
                          </div>

                          <h4 className="text-xl font-black text-slate-300 tracking-tight mb-1 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="truncate">{reward.title}</span>
                          </h4>

                          {desc && (
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                              {desc}
                            </p>
                          )}
                        </div>

                        {/* Progress Bar & Star Deficit */}
                        <div className="pt-3 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                            <span>Savings Progress</span>
                            <span className="text-amber-300/90 font-black">
                              Need {deficit} more ⭐
                            </span>
                          </div>
                          <div className="w-full bg-slate-950/80 h-3 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div
                              className="bg-linear-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}