"use client";

import React, { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { Task } from "@/types";

interface VaultTabProps {
  tasks: Task[];
  onCreateTask: (taskData: { title: string; starValue: number; icon: string }) => void;
}

export function VaultTab({ tasks, onCreateTask }: VaultTabProps) {
  const [title, setTitle] = useState("");
  const [stars, setStars] = useState(2);
  const [icon, setIcon] = useState("⭐");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onCreateTask({ title, starValue: stars, icon });
    setTitle("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-400" /> Add Task to Master Vault
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Chore Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clean Bedroom"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Icon Emoji</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Star Reward</label>
              <input
                type="number"
                value={stars}
                onChange={(e) => setStars(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-amber-400"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            <Sparkles className="w-5 h-5" /> Save to Vault
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold">Master Task Vault ({tasks.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{task.icon}</span>
                <div>
                  <h3 className="font-bold">{task.title}</h3>
                  <p className="text-xs text-slate-400">Ages {task.minAge}–{task.maxAge} yrs</p>
                </div>
              </div>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-bold text-sm">
                ⭐ {task.starValue} Stars
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}