"use client";

import type React from "react";
import { useEffect, useState } from "react";
import type { NavigationMenu, KioskConfig } from "./types";

interface AdminSettingsSectionsProps {
  activeMenu: NavigationMenu;
  newPin: string;
  setNewPin: (value: string) => void;
  confirmPin: string;
  setConfirmPin: (value: string) => void;
  kioskConfig: KioskConfig;
  kioskSaveMessage: string;
  setKioskConfig: (value: KioskConfig) => void;
  handleResetPin: (event: React.FormEvent) => Promise<void>;
  handleSaveKioskConfig: (event: React.FormEvent) => Promise<void>;
}

export function AdminSettingsSections({ activeMenu, newPin, setNewPin, confirmPin, setConfirmPin, kioskConfig, kioskSaveMessage, setKioskConfig, handleResetPin, handleSaveKioskConfig }: AdminSettingsSectionsProps) {
  if (activeMenu !== "admin_settings") return null;
  return <div className="grid items-start gap-5 lg:grid-cols-2">
{/* 11. PIN RESET */}

            <div className="min-w-0 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Security</h3>
                <p className="text-xs text-slate-400 mt-1">Set a new 4–6 digit PIN for kiosk mode unlocking</p>
              </div>

              <form onSubmit={handleResetPin} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="a11y-parent-page-tsx-22" className="block text-slate-400 font-bold mb-1">New PIN</label>
                  <input id="a11y-parent-page-tsx-22"
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    required
                    placeholder="****"
                    className="w-full bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl text-white text-center text-xl tracking-widest"
                  />
                </div>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-23" className="block text-slate-400 font-bold mb-1">Confirm New PIN</label>
                  <input id="a11y-parent-page-tsx-23"
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    required
                    placeholder="****"
                    className="w-full bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl text-white text-center text-xl tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-11 rounded-lg bg-slate-100 px-4 font-semibold text-slate-900"
                >
                  Change parent PIN
                </button>
              </form>
            </div>

          {/* 12. KIOSK DISPLAY SETTINGS */}

            <div className="min-w-0 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Kiosk Display</h3>
                <p className="text-xs text-slate-400 mt-1">Configure audio and idle timeout behaviors</p>
              </div>

              <form onSubmit={handleSaveKioskConfig} className="space-y-5 text-xs">
                <div>
                  <label htmlFor="a11y-parent-page-tsx-24" className="block text-slate-400 font-bold mb-1">Idle Auto-Lock Timeout (Seconds)</label>
                  <input id="a11y-parent-page-tsx-24"
                    type="number"
                    value={kioskConfig.idleTimeoutSec}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, idleTimeoutSec: Number(e.target.value) })}
                    className="w-full bg-slate-950/80 border border-white/10 p-3.5 rounded-2xl text-white font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Seconds of touch inactivity before returning to the home screen.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/80 border border-white/5 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-white text-sm">Audio Sound Effects</h4>
                    <p className="text-[11px] text-slate-400">Play arcade chimes on chore completions and prize redemptions.</p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Audio sound effects"
                    checked={kioskConfig.soundEffects}
                    onChange={(e) => setKioskConfig({ ...kioskConfig, soundEffects: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded"
                  />
                </div>

                <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
                  Reduce animation and celebrations
                  <input type="checkbox" checked={kioskConfig.reducedMotion}
                    onChange={(event) => setKioskConfig({ ...kioskConfig, reducedMotion: event.target.checked })} />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
                  Show star balances on the profile picker
                  <input type="checkbox" checked={kioskConfig.showPickerStars}
                    onChange={(event) => setKioskConfig({ ...kioskConfig, showPickerStars: event.target.checked })} />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
                  Larger text and touch controls
                  <input type="checkbox" checked={kioskConfig.largeKioskText}
                    onChange={(event) => setKioskConfig({ ...kioskConfig, largeKioskText: event.target.checked })} />
                </label>
                <output className="block text-sm text-slate-300">{kioskSaveMessage}</output>
                <button type="submit" className="min-h-11 rounded-lg bg-slate-100 px-4 font-semibold text-slate-900">
                  Save Display Settings
                </button>
              </form>
            </div>

          <ProgressionSettings />
  </div>;
}

function ProgressionSettings() {
  const [xpMinMultiplier, setMin] = useState(5);
  const [xpMaxMultiplier, setMax] = useState(8);
  const [coinsPerLevel, setCoins] = useState(25);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/parent/progression-settings", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load progression settings.");
        return response.json();
      })
      .then(data => { if (active) {
        setMin(data.xpMinMultiplier);
        setMax(data.xpMaxMultiplier);
        setCoins(data.coinsPerLevel);
      } }).catch(error => { if (active) setMessage(String(error)); });
    return () => { active = false; };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/parent/progression-settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xpMinMultiplier, xpMaxMultiplier, coinsPerLevel }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save settings.");
      setMessage("Saved. Only future approvals and newly reached levels use these values.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed"); }
    finally { setBusy(false); }
  }
  return <section className="min-w-0 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
    <h3 className="text-lg font-semibold text-white">Avatar Progression</h3>
    <p className="text-xs text-slate-400">Every approved Star earns a random amount of XP between these multipliers. Level rewards are only paid once. Changes are prospective.</p>
    <form onSubmit={save} className="space-y-4 text-sm">
      <label className="block text-slate-300">Minimum XP per Star
        <input className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" type="number" min="1" max="100" required value={xpMinMultiplier} onChange={e => setMin(Number(e.target.value))} />
      </label>
      <label className="block text-slate-300">Maximum XP per Star
        <input className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" type="number" min={xpMinMultiplier} max="100" required value={xpMaxMultiplier} onChange={e => setMax(Number(e.target.value))} />
      </label>
      <label className="block text-slate-300">Avatar Coins per new level
        <input className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" type="number" min="0" max="1000" required value={coinsPerLevel} onChange={e => setCoins(Number(e.target.value))} />
      </label>
      <output aria-live="polite" className="block text-slate-300">{message}</output>
      <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-indigo-600 px-5 font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save Progression Settings"}</button>
    </form>
  </section>;
}
