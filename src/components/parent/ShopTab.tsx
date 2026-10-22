"use client";

import React, { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { Child, Reward } from "@/types";

interface ShopTabProps {
  rewards: Reward[];
  childrenList: Child[];
  onCreateReward: (rewardData: Partial<Reward> & { assignedChildIds: string[] }) => void;
  onAssignReward: (rewardId: string, childId: string) => void;
}

export function ShopTab({ rewards, childrenList, onCreateReward, onAssignReward }: ShopTabProps) {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState(5);
  const [icon, setIcon] = useState("🎁");
  const [stock, setStock] = useState(4);
  const [minAge, setMinAge] = useState(2);
  const [maxAge, setMaxAge] = useState(18);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onCreateReward({
      title,
      starCost: cost,
      icon,
      monthlyStock: stock,
      minAge,
      maxAge,
      assignedChildIds: selectedChildIds,
    });
    setTitle("");
    setSelectedChildIds([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-400" /> Create Shop Reward
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Reward Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Screen Time"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-center text-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Star Cost</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 font-bold text-amber-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 font-bold text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Age Bracket</label>
            <select
              onChange={(e) => {
                const [min, max] = e.target.value.split("-").map(Number);
                setMinAge(min);
                setMaxAge(max);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200"
            >
              <option value="2-4">Toddler Stage (2–4)</option>
              <option value="5-8">Early Primary (5–8)</option>
              <option value="9-12">Upper Primary (9–12)</option>
              <option value="2-18">All Ages (2–18)</option>
            </select>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            + Save Reward to Inventory
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold">Active Reward Inventory ({rewards.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map((rw) => (
            <Card key={rw.id} className="flex flex-col justify-between space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{rw.icon}</span>
                  <div>
                    <h3 className="font-bold">{rw.title}</h3>
                    <p className="text-xs text-slate-400">
                      Stock: <strong className="text-indigo-400">{rw.currentStock} / {rw.monthlyStock}</strong> | Ages {rw.minAge}–{rw.maxAge} yrs
                    </p>
                  </div>
                </div>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-bold text-sm">
                  ⭐ {rw.starCost}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Visible To:</span>
                <div className="flex gap-1.5">
                  {childrenList.map((c) => {
                    const isAssigned = rw.assignments?.some((a) => a.childId === c.id) || rw.assignments?.length === 0;
                    return (
                      <button
                        key={c.id}
                        onClick={() => onAssignReward(rw.id, c.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                          isAssigned
                            ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                            : "bg-slate-800 border-slate-700 text-slate-500"
                        }`}
                      >
                        {c.avatar} {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}