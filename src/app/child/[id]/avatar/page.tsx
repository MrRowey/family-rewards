"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Check, Lock, Palette, Smile, Cpu, Wand2 } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useKioskSettings } from "@/hooks/useKioskSettings";

interface DressingRoomProps {
  params: Promise<{ id: string }>;
}

const THEMES = [
  { id: "bottts", label: "Robots", icon: Cpu },
  { id: "adventurer", label: "Heroes", icon: Wand2 },
  { id: "funEmoji", label: "Emojis", icon: Smile },
];

const BOT_PARTS = {
  colors: ["4f46e5", "06b6d4", "10b981", "f59e0b", "ef4444", "ec4899", "8b5cf6"],
  top: [
    { id: "antenna", label: "Antenna", minChores: 0 },
    { id: "horns", label: "Mech Horns", minChores: 0 },
    { id: "bulb01", label: "Idea Bulb", minChores: 3 },
    { id: "radar", label: "Deep Radar", minChores: 8 },
    { id: "crown", label: "Golden Crown", minChores: 15 },
  ],
  eyes: [
    { id: "round", label: "Curious", minChores: 0 },
    { id: "square", label: "Focus", minChores: 0 },
    { id: "eva", label: "Laser Visor", minChores: 5 },
    { id: "sparkle", label: "Star Eyes", minChores: 10 },
  ],
};

export default function AvatarCreatorPage({ params }: DressingRoomProps) {
  const router = useRouter();
  const { id } = use(params);
  const { playSfx } = useKioskSettings();

  const [theme, setTheme] = useState("bottts");
  const [selectedColor, setSelectedColor] = useState("4f46e5");
  const [selectedTop, setSelectedTop] = useState("antenna");
  const [selectedEyes, setSelectedEyes] = useState("round");
  const [completedChores, setCompletedChores] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchChildAvatar() {
      try {
        const res = await fetch(`/api/children/${id}/avatar`);
        if (res.ok) {
          const data = await res.json();
          if (data.theme) setTheme(data.theme);
          if (data.config?.baseColor) setSelectedColor(data.config.baseColor[0]);
          if (data.config?.top) setSelectedTop(data.config.top[0]);
          if (data.config?.eyes) setSelectedEyes(data.config.eyes[0]);
          setCompletedChores(data.completedTasksCount || 0);
        }
      } catch (err) {
        console.error("Failed to load avatar state:", err);
      }
    }
    fetchChildAvatar();
  }, [id]);

  const currentConfig = {
    baseColor: [selectedColor],
    top: [selectedTop],
    eyes: [selectedEyes],
  };

  const handleSave = async () => {
    setSaving(true);
    playSfx("success");
    await fetch(`/api/children/${id}/avatar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, config: currentConfig }),
    });
    setSaving(false);
    router.back();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 touch-manipulation select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-6 border-b border-white/10">
        <button
          onClick={() => {
            playSfx("click");
            router.back();
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 border border-white/10 font-black text-xs text-slate-300 active:scale-95 transition min-h-[48px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center">
          <h1 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Avatar Dressing Room
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Chores Completed: <strong className="text-emerald-400 font-black">{completedChores}</strong>
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition min-h-[48px]"
        >
          <Check className="w-4 h-4" /> {saving ? "Saving..." : "Equip Look"}
        </button>
      </header>

      {/* Main Dressing Room View */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-6xl mx-auto w-full pt-6">
        {/* Left: Avatar Showcase */}
        <div className="md:col-span-5 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
          <div className="w-64 h-64 rounded-full bg-slate-950 border-4 border-indigo-500/40 p-4 shadow-inner flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-indigo-500/20 to-transparent blur-xl pointer-events-none" />
            <AvatarDisplay
              theme={theme}
              config={JSON.stringify(currentConfig)}
              size={200}
            />
          </div>

          <div className="mt-6 flex gap-2">
            {THEMES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    playSfx("click");
                    setTheme(t.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition border ${
                    theme === t.id
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Customization Controls */}
        <div className="md:col-span-7 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-6 shadow-2xl">
          {/* Colors */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-400" /> Chassis / Skin Tone
            </h3>
            <div className="flex flex-wrap gap-3">
              {BOT_PARTS.colors.map((hex) => (
                <button
                  key={hex}
                  onClick={() => {
                    playSfx("click");
                    setSelectedColor(hex);
                  }}
                  style={{ backgroundColor: `#${hex}` }}
                  className={`w-11 h-11 rounded-2xl border-2 transition active:scale-90 ${
                    selectedColor === hex ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Head / Top Gear */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Headgear & Gear
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BOT_PARTS.top.map((item) => {
                const isLocked = completedChores < item.minChores;
                return (
                  <button
                    key={item.id}
                    disabled={isLocked}
                    onClick={() => {
                      playSfx("click");
                      setSelectedTop(item.id);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-xs font-bold transition min-h-[56px] relative ${
                      isLocked
                        ? "bg-slate-950/40 border-white/5 text-slate-600 cursor-not-allowed"
                        : selectedTop === item.id
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-950/60 border-white/10 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {isLocked ? (
                      <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-black">
                        <Lock className="w-3.5 h-3.5" /> {item.minChores} Chores
                      </span>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Eyes / Expressions */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Visor & Expressions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BOT_PARTS.eyes.map((item) => {
                const isLocked = completedChores < item.minChores;
                return (
                  <button
                    key={item.id}
                    disabled={isLocked}
                    onClick={() => {
                      playSfx("click");
                      setSelectedEyes(item.id);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-xs font-bold transition min-h-[56px] relative ${
                      isLocked
                        ? "bg-slate-950/40 border-white/5 text-slate-600 cursor-not-allowed"
                        : selectedEyes === item.id
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-950/60 border-white/10 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {isLocked ? (
                      <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-black">
                        <Lock className="w-3.5 h-3.5" /> {item.minChores} Chores
                      </span>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}