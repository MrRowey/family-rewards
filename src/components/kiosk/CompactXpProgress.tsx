"use client";

import { Info } from "lucide-react";
import { avatarCurrencyName } from "@/lib/avatar-currency-names";

export type XpSnapshot = {
  level: number;
  current: number;
  required: number;
  percent: number;
};

export type ProgressionRules = {
  xpMinMultiplier: number;
  xpMaxMultiplier: number;
  coinsPerLevel: number;
  coinsPerAchievement: number;
  milestoneBonusCoins: number;
};

type Props = {
  progress: XpSnapshot;
  avatarCoins: number;
  theme?: string | null;
  rules?: ProgressionRules;
};

export function CompactXpProgress({ progress, avatarCoins, theme, rules }: Props) {
  const required = Math.max(1, progress.required);
  const current = Math.min(required, Math.max(0, progress.current));
  const label = avatarCurrencyName(theme, avatarCoins);
  return (
    <section aria-label="Level and XP progress" className="rounded-2xl border border-indigo-400/25 bg-slate-900/90 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-base font-black text-indigo-200 sm:text-lg">Level {progress.level}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-300">🪙 {avatarCoins} {label}</span>
          {rules && (
            <details className="group relative">
              <summary aria-label="How to earn XP and avatar currency" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 [&::-webkit-details-marker]:hidden">
                <Info aria-hidden="true" size={19} />
              </summary>
              <div role="note" className="absolute right-0 top-12 z-30 hidden w-[min(20rem,82vw)] rounded-2xl border border-indigo-400/40 bg-slate-950 p-4 text-sm text-slate-200 shadow-2xl group-open:block group-hover:block group-focus-within:block">
                <p className="mb-2 font-bold text-white">How rewards work</p>
                <p>Each Star from an approved chore earns {rules.xpMinMultiplier}–{rules.xpMaxMultiplier} XP.</p>
                <p className="mt-1">New levels earn {rules.coinsPerLevel} {avatarCurrencyName(theme, rules.coinsPerLevel)}.</p>
                <p className="mt-1">Every 10th level adds {rules.milestoneBonusCoins} bonus {avatarCurrencyName(theme, rules.milestoneBonusCoins)} and a frame.</p>
                <p className="mt-1">Each new achievement earns {rules.coinsPerAchievement} {avatarCurrencyName(theme, rules.coinsPerAchievement)}.</p>
              </div>
            </details>
          )}
        </div>
      </div>
      <progress
        aria-label={`Level ${progress.level}: ${current} of ${required} XP toward the next level`}
        value={current}
        max={required}
        className="block h-3 w-full overflow-hidden rounded-full bg-slate-800 accent-indigo-400 [&::-webkit-progress-bar]:bg-slate-800 [&::-webkit-progress-value]:bg-indigo-400 [&::-moz-progress-bar]:bg-indigo-400"
      />
      <div className="mt-1 text-right text-xs font-medium text-slate-400">{current} / {required} XP to next level</div>
    </section>
  );
}
