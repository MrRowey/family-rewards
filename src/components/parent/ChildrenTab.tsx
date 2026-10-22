"use client";

import React, { useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Child } from "@/types";

interface ChildrenTabProps {
  childrenList: Child[];
  onAddChild: (childData: { name: string; dob: string; avatar: string }) => void;
  onDeleteChild: (id: string, name: string) => void;
}

export function ChildrenTab({ childrenList, onAddChild, onDeleteChild }: ChildrenTabProps) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [avatar, setAvatar] = useState("🦁");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob) return;
    onAddChild({ name, dob, avatar });
    setName("");
    setDob("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-400" /> Add Additional Child
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Child&apos;s Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Archie"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Avatar Emoji</label>
            <div className="flex gap-2">
              {["🦁", "🐻", "🦊", "🦕", "🚀", "🦄"].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatar(e)}
                  className={`text-2xl p-2 rounded-xl border min-h-12 min-w-12 ${
                    avatar === e ? "bg-indigo-600 border-indigo-400" : "bg-slate-800 border-slate-700"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Save Family Profile
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold">Family Profiles ({childrenList.length})</h2>
        <div className="space-y-3">
          {childrenList.map((child) => (
            <Card key={child.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{child.avatar}</span>
                <div>
                  <h3 className="font-bold text-lg">{child.name}</h3>
                  <p className="text-xs text-slate-400">
                    {child.dob ? `DOB: ${new Date(child.dob).toLocaleDateString()}` : `Stage: ${child.stageName || "Kiosk Profile"}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-amber-400 font-bold">⭐ {child.stars} Stars</span>
                <Button variant="danger" onClick={() => onDeleteChild(child.id, child.name)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}