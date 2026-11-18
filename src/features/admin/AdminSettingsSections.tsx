"use client";

import type React from "react";
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
  return <>
{/* 11. PIN RESET */}
          {activeMenu === "user_pin" && (
            <div className="max-w-md bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl">
              <div>
                <h3 className="font-black text-xl text-white">Reset Parent PIN</h3>
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
                  className="w-full py-4 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 font-black rounded-2xl text-white shadow-lg shadow-indigo-600/30 transition min-h-[48px]"
                >
                  Update Security PIN
                </button>
              </form>
            </div>
          )}

          {/* 12. KIOSK DISPLAY SETTINGS */}
          {activeMenu === "admin_display" && (
            <div className="max-w-xl bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl">
              <div>
                <h3 className="font-black text-xl text-white">Kiosk Hardware & Screen Settings</h3>
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
                <output className="block text-sm text-slate-300">{kioskSaveMessage}</output>
                <button type="submit" className="min-h-11 w-full rounded-lg bg-slate-100 px-4 font-semibold text-slate-900">
                  Save Display Settings
                </button>
              </form>
            </div>
          )}

          
  </>;
}
