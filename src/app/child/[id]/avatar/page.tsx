"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Sparkles, Lock } from "lucide-react";
import AvatarDisplay, { styleProperties } from "@/components/AvatarDisplay";
import { AVATAR_VARIANT_PRICE } from "@/lib/avatar-catalog";
import { useKioskSettings } from "@/hooks/useKioskSettings";

const THEMES = [
  { id: "sprouts", name: "Sprouts", parts: ["animation", "cheeks", "eyes", "mouth", "pattern", "plant", "pot"], colors: ["backgroundColor", "bloomColor", "inkColor", "plantColor", "potColor"] },
  { id: "bottts", name: "Bottts", parts: ["eyes", "head", "mouth", "sides", "texture", "top"], colors: ["backgroundColor", "baseColor"] },
  { id: "botttsNeutral", name: "Bottts Neutral", parts: ["eyes", "mouth", "texture"], colors: ["backgroundColor"] },
  { id: "critters", name: "Critters", parts: ["animation", "body", "cheeks", "eyes", "mouth", "pattern", "top"], colors: ["backgroundColor", "accentColor", "bodyColor", "inkColor"] },
  { id: "voxelBot", name: "Voxel Bot", parts: ["animation", "chest", "eyes", "mouth", "top"], colors: ["backgroundColor", "accentColor", "bodyColor", "glowColor", "screenColor"] },
  { id: "constellation", name: "Constellations", parts: ["animation", "comet", "constellation", "star"], colors: ["backgroundColor", "constellationColor"] },
  { id: "planets", name: "Planets", parts: ["animation", "moons", "planet", "ring", "shade", "star", "surface"], colors: ["backgroundColor", "moonColor", "planetColor"] },
  { id: "adventurer", name: "Heroes", parts: [], colors: ["backgroundColor"] },
  { id: "funEmoji", name: "Emojis", parts: [], colors: ["backgroundColor"] },
] as const;

const PALETTE = ["f8fafc", "1e293b", "4f46e5", "06b6d4", "10b981", "f59e0b", "ef4444", "ec4899", "8b5cf6", "facc15"];
type Config = { flip?: "none" | "horizontal" | "vertical" | "both"; options?: Record<string, string[] | boolean>; baseColor?: string[]; top?: string[]; eyes?: string[] };
const label = (s: string) => s.replace(/Color$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());

export default function AvatarCreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { playSfx } = useKioskSettings();
  const [theme, setTheme] = useState("bottts");
  const [config, setConfig] = useState<Config>({ flip: "none", options: {} });
  const [firstAvatar, setFirstAvatar] = useState<boolean>();
  const [completedChores, setCompletedChores] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [coins, setCoins] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [buying, setBuying] = useState(false);
  const [activeTab, setActiveTab] = useState("eyes");
  const [previewPart, setPreviewPart] = useState<{ component: string; variant: string; first: string } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/children/${id}/avatar`);
        if (!response.ok) throw new Error("Could not load this profile.");
        const data = await response.json();
        if (!active) return;
        setFirstAvatar(!data.hasAvatar);
        setTheme(data.theme || "bottts");
        setConfig(data.config || { flip: "none", options: {} });
        setCompletedChores(data.completedTasksCount || 0);
        setCoins(data.avatarCoins || 0);
        setOwned((data.unlockedVariants || []).map((item: { theme: string; component: string; variant: string }) => [item.theme, item.component, item.variant].join(":")));
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Unable to load avatar."); }
    })();
    return () => { active = false; };
  }, [id]);

  const selected = THEMES.find(t => t.id === theme) || THEMES[1];
  const properties = styleProperties(theme);
  const options = config.options || {};
  // Explicitly equip the free starter variant for every component, rather than allowing seeded random locked parts.
  const equippedConfig = useMemo<Config>(() => {
    const next: Record<string, string[] | boolean> = { ...options };
    for (const [key, descriptor] of Object.entries(properties)) {
      if (key.endsWith("Variant") && descriptor.type === "enum" && descriptor.values?.length && !Array.isArray(next[key])) next[key] = [descriptor.values[0]];
    }
    return { ...config, options: next };
  }, [config, options, properties]);
  const setOption = (key: string, value: string[] | boolean) => {
    setConfig(previous => ({ ...previous, options: { ...previous.options, [key]: value } }));
    playSfx("click");
  };
  const chooseVariant = async (component: string, variant: string, first: string) => {
    const key = [theme, component, variant].join(":");
    if (variant === first || owned.includes(key)) { setOption(component, [variant]); return; }
    if (firstAvatar) { setError("Save your first avatar with the free parts before buying extras."); return; }
    if (buying) return;
    if (coins < AVATAR_VARIANT_PRICE) { setError("Not enough Avatar Coins yet."); return; }

    setBuying(true);
    setError("");
    try {
      const response = await fetch("/api/kiosk/avatar/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId: id, theme, component, variant }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Purchase failed.");
      setCoins(result.avatarCoins);
      setOwned(previous => [...previous, key]);
      setOption(component, [variant]);
      setPreviewPart(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Purchase failed."); }
    finally { setBuying(false); }
  };
  const previewConfig = previewPart ? { ...equippedConfig, options: { ...equippedConfig.options, [previewPart.component]: [previewPart.variant] } } : equippedConfig;
  const save = async () => {
    if (firstAvatar === undefined || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(firstAvatar ? "/api/kiosk/avatar" : `/api/children/${id}/avatar`, {
        method: firstAvatar ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: id, theme, config: equippedConfig }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save your avatar.");
      playSfx("success");
      router.replace(`/kid/${encodeURIComponent(id)}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save your avatar."); }
    finally { setSaving(false); }
  };

  return <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
      <button type="button" onClick={() => router.back()} className="min-h-12 rounded-2xl border border-white/20 px-4 flex items-center gap-2"><ArrowLeft size={18}/> Back</button>
      <div className="text-center"><h1 className="font-black text-xl flex items-center gap-2"><Sparkles className="text-amber-400"/> Avatar Dressing Room</h1><p className="text-slate-400 text-xs">{completedChores} chores completed · 🪙 {coins} Avatar Coins</p></div>
      <button type="button" onClick={() => void save()} disabled={saving || firstAvatar === undefined} className="min-h-12 rounded-2xl bg-emerald-600 px-5 font-bold disabled:opacity-50 flex items-center gap-2"><Check size={18}/>{saving ? "Saving..." : "Equip Look"}</button>
    </header>
    {error && <p role="alert" className="my-4 text-amber-300">{error}</p>}
    <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5">
      <section className="lg:col-span-4 lg:sticky lg:top-5 lg:self-start rounded-3xl bg-slate-900 border border-white/10 p-5 flex flex-col items-center gap-5">
        <div className="w-64 h-64 max-w-full rounded-3xl border-4 border-indigo-500/40 bg-slate-950 p-4 flex items-center justify-center">
          <AvatarDisplay theme={theme} seed={id} config={JSON.stringify(equippedConfig)} size={200}/>
        </div>
        <h2 className="text-lg font-black">{selected.name}</h2>
        {firstAvatar ? <>
          <p className="text-sm text-slate-300 text-center">Choose your avatar theme. After saving, only a parent can change the theme.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {THEMES.filter(t => !["adventurer", "funEmoji"].includes(t.id)).map(t =>
              <button type="button" key={t.id} aria-pressed={theme === t.id} onClick={() => { setTheme(t.id); setConfig({ flip: "none", options: {} }); setActiveTab(t.parts[0] || "colours"); playSfx("click"); }}
                className={`min-h-12 rounded-xl px-4 text-sm font-bold border ${theme === t.id ? "bg-indigo-600 border-indigo-400" : "bg-slate-950 border-white/20"}`}>{t.name}</button>
            )}
          </div>
        </> : <p className="text-sm text-slate-400 text-center">Your theme is locked in. Ask a parent if you want to switch themes.</p>}
      </section>
      {previewPart && <div role="dialog" aria-modal="true" aria-label="Preview locked avatar part" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-slate-900 p-6 flex flex-col items-center gap-4">
          <h2 className="text-xl font-black">Preview: {label(previewPart.variant)}</h2>
          <p className="text-sm text-slate-300 text-center">See how this {label(previewPart.component.replace(/Variant$/, ""))} looks on your avatar before buying.</p>
          <AvatarDisplay theme={theme} seed={id} config={JSON.stringify(previewConfig)} size={220}/>
          <p className="text-amber-300 font-bold">🔒 {AVATAR_VARIANT_PRICE} Avatar Coins · You have {coins}</p>
          <button type="button" disabled={buying || firstAvatar || coins < AVATAR_VARIANT_PRICE} onClick={() => void chooseVariant(previewPart.component, previewPart.variant, previewPart.first)} className="w-full min-h-12 rounded-xl bg-indigo-600 font-bold disabled:opacity-50">{buying ? "Unlocking..." : firstAvatar ? "Save your starter avatar first" : coins < AVATAR_VARIANT_PRICE ? "Not enough coins" : "Unlock & Equip"}</button>
          <button type="button" onClick={() => setPreviewPart(null)} className="w-full min-h-12 rounded-xl border border-white/20">Back to Workshop</button>
        </div>
      </div>}
      <section className="lg:col-span-8 rounded-3xl bg-slate-900 border border-white/10 p-5 space-y-5">
        <nav aria-label="Avatar customisation categories" className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain border-b border-white/10 pb-4 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
          {selected.parts.map(part => <button type="button" key={part} aria-pressed={activeTab === part} onClick={() => setActiveTab(part)}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-4 text-sm font-bold ${activeTab === part ? "bg-indigo-600 border-indigo-400" : "border-white/20 bg-slate-950"}`}>{label(part)}</button>)}
          <button type="button" aria-pressed={activeTab === "colours"} onClick={() => setActiveTab("colours")} className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-4 text-sm font-bold ${activeTab === "colours" ? "bg-indigo-600 border-indigo-400" : "border-white/20 bg-slate-950"}`}>Colours</button>
          <button type="button" aria-pressed={activeTab === "flip"} onClick={() => setActiveTab("flip")} className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-4 text-sm font-bold ${activeTab === "flip" ? "bg-indigo-600 border-indigo-400" : "border-white/20 bg-slate-950"}`}>Flip</button>
        </nav>
        {activeTab === "flip" && <div><h2 className="font-black mb-3">Flip your avatar</h2><div className="flex flex-wrap gap-2">
          {(["none", "horizontal", "vertical", "both"] as const).map(value =>
            <button type="button" key={value} aria-pressed={(config.flip || "none") === value} onClick={() => setConfig(prev => ({ ...prev, flip: value }))}
              className={`min-h-12 rounded-xl border px-4 capitalize ${(config.flip || "none") === value ? "bg-indigo-600 border-indigo-400" : "border-white/20"}`}>{value}</button>
          )}
        </div></div>}
        {selected.parts.filter(part => part === activeTab).map(part => {
          const key = Object.keys(properties).find(k => k.toLowerCase() === (part + "Variant").toLowerCase() || k.toLowerCase() === part.toLowerCase());
          if (!key) return null;
          const schema = properties[key];
          if (schema.type === "boolean") return <div key={part} className="flex items-center justify-between"><label className="font-bold">{label(part)}</label><input type="checkbox" checked={options[key] === true} onChange={e => setOption(key, e.target.checked)} className="w-6 h-6"/></div>;
          const choices = schema.values || [];
          if (!choices.length) return null;
          return <div key={part}><h3 className="font-bold text-sm mb-2">{label(part)}</h3><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {choices.map(choice => {
              const locked = choice !== choices[0] && !owned.includes([theme, key, choice].join(":"));
              const active = (Array.isArray(options[key]) ? options[key][0] : choices[0]) === choice;
              const thumbnailConfig: Config = {
                ...equippedConfig,
                options: { ...equippedConfig.options, [key]: [choice] },
              };
              return <button type="button" key={choice} aria-pressed={active}
                aria-label={`${label(choice)}${locked ? `, locked, ${AVATAR_VARIANT_PRICE} Avatar Coins` : ", available"}`}
                onClick={() => { if (!locked) setOption(key, [choice]); else setPreviewPart({ component: key, variant: choice, first: choices[0] }); }}
                disabled={buying}
                className={`relative flex w-full min-w-0 flex-col items-center gap-2 rounded-2xl border p-2 text-center text-xs transition-colors ${active ? "border-indigo-400 bg-indigo-600/30" : "border-white/20 bg-slate-950 hover:border-indigo-400/70"}`}>
                <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-slate-800">
                  <AvatarDisplay theme={theme} seed={id} config={JSON.stringify(thumbnailConfig)} size={76}/>
                  {locked && <span className="absolute right-0.5 top-0.5 rounded-full bg-slate-950/90 p-1 text-amber-300"><Lock size={13}/></span>}
                </span>
                <span className="max-w-full break-words font-semibold">{label(choice)}</span>
                <span className={locked ? "font-bold text-amber-300" : "text-emerald-300"}>{locked ? `${AVATAR_VARIANT_PRICE} 🪙` : active ? "Equipped" : "Owned / Free"}</span>
              </button>;
            })}
          </div></div>;
        })}
        {activeTab === "colours" && <h2 className="font-black text-lg">Colours</h2>}
        {selected.colors.filter(color => activeTab === "colours").map(color => {
          const key = Object.keys(properties).find(k => k.toLowerCase() === color.toLowerCase());
          if (!key) return null;
          const value = Array.isArray(options[key]) ? options[key][0] : "";
          return <div key={color}><h3 className="font-bold text-sm mb-2">{label(color)}</h3><div className="flex flex-wrap gap-2">
            {PALETTE.map(hex => <button type="button" key={hex} aria-label={`${label(color)} #${hex}`} aria-pressed={value === hex} onClick={() => setOption(key, [hex])} style={{ backgroundColor: `#${hex}` }}
              className={`w-11 h-11 rounded-xl border-2 ${value === hex ? "border-white scale-110" : "border-transparent"}`}/>)}
          </div></div>;
        })}
      </section>
    </div>
  </main>;
}
