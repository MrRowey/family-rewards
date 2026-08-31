"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, ShoppingBag, Sparkles, Clock } from "lucide-react";
import { calculateAgeProfile } from "@/lib/ageRules";

export default function RewardShop() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([]);

  const loadShopData = useCallback(async () => {
    try {
      const [rwRes, chRes, appRes] = await Promise.all([
        fetch("/api/rewards"),
        fetch("/api/children"),
        fetch("/api/approvals"),
      ]);

      if (rwRes.ok) setRewards(await rwRes.json());
      
      if (chRes.ok) {
        const chData = await chRes.json();
        setChildren(chData);
        if (chData.length > 0 && !selectedChildId) {
          setSelectedChildId(chData[0].id);
        }
      }

      if (appRes.ok) {
        const appData = await appRes.json();
        setPendingRedemptions(appData.pendingRewards || []);
      }
    } catch (err) {
      console.error("Failed to load shop data:", err);
    }
  }, [selectedChildId]);

  useEffect(() => {
    loadShopData();
  }, [loadShopData]);

  const activeChild = children.find((c) => c.id === selectedChildId);
  const activeChildAge = activeChild ? calculateAgeProfile(new Date(activeChild.dob)).ageYears : 0;

  // Age bracket & Per-Child Assignment Filter
  const visibleRewards = rewards.filter((reward) => {
    // 1. Stock check (Meltdown guard: Hide out of stock)
    if (reward.currentStock <= 0) return false;

    // 2. Age bracket check
    if (activeChildAge < reward.minAge || activeChildAge > reward.maxAge) return false;

    // 3. Specific child assignment check
    if (reward.assignments && reward.assignments.length > 0) {
      return reward.assignments.some((a: any) => a.childId === selectedChildId);
    }

    return true;
  });

  const handleClaimReward = async (rewardId: string) => {
    if (!selectedChildId) return;

    const res = await fetch("/api/rewards/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: selectedChildId, rewardId }),
    });

    if (res.ok) {
      loadShopData();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to claim reward.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans select-none">
      {/* Header */}
      <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-800 mb-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition">
            <ArrowLeft className="w-6 h-6 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 text-amber-400" /> Star Reward Shop
            </h1>
            <p className="text-xs text-slate-400">Redeem earned stars for prizes & privileges</p>
          </div>
        </div>

        {/* Child Selector Tabs */}
        <div className="flex bg-slate-800 p-1.5 rounded-2xl gap-1.5">
          {children.map((c) => {
            const isActive = selectedChildId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  isActive ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-xl">{c.avatar}</span>
                <span>{c.name}</span>
                <span className="text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-black">
                  ⭐ {c.stars}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Rewards Grid */}
      {visibleRewards.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-16 text-center text-slate-500">
          🎁 No rewards available for {activeChild?.name || "this child"} yet. Use the Parent Portal (Shield icon) to add age-appropriate rewards!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleRewards.map((reward) => {
            const childStars = activeChild?.stars || 0;
            const hasEnoughStars = childStars >= reward.starCost;

            const isPending = pendingRedemptions.some(
              (pr) => pr.childId === selectedChildId && pr.rewardId === reward.id
            );

            return (
              <div
                key={reward.id}
                className={`bg-slate-900 border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all ${
                  isPending
                    ? "border-amber-500/40 bg-amber-950/10"
                    : hasEnoughStars
                    ? "border-amber-500/30 hover:border-amber-500/60"
                    : "border-slate-800/80 opacity-60 grayscale"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-5xl">{reward.icon}</span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3.5 py-1 rounded-full font-black text-sm">
                      ⭐ {reward.starCost} Stars
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-1">{reward.title}</h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Stock remaining: <strong className="text-slate-200">{reward.currentStock} left</strong> this month
                  </p>
                </div>

                <div>
                  {isPending ? (
                    <div className="w-full bg-amber-500/20 text-amber-400 border border-amber-500/30 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" /> Pending Parent Approval
                    </div>
                  ) : hasEnoughStars ? (
                    <button
                      onClick={() => handleClaimReward(reward.id)}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <Sparkles className="w-5 h-5" /> Redeem Reward
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Locked
                        </span>
                        <span>Need {reward.starCost - childStars} more ⭐</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (childStars / reward.starCost) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}