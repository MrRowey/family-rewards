"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Avatar, Style, OptionsDescriptor } from "@dicebear/core";
import bottts from "@dicebear/styles/bottts.json";
import adventurer from "@dicebear/styles/adventurer.json";
import funEmoji from "@dicebear/styles/fun-emoji.json";
import sprouts from "@dicebear/styles/sprouts.json";
import botttsNeutral from "@dicebear/styles/bottts-neutral.json";
import critters from "@dicebear/styles/critters.json";
import voxelBot from "@dicebear/styles/voxel-bot.json";
import constellation from "@dicebear/styles/constellation.json";
import planets from "@dicebear/styles/planets.json";

interface AvatarProps {
  theme?: string | null;
  config?: string | null;
  seed?: string;
  fallbackEmoji?: string;
  size?: number;
  className?: string;
}

// Strictly typed collection map avoiding 'any'
export const STYLES = { sprouts, bottts, botttsNeutral, critters, voxelBot, constellation, planets, adventurer, funEmoji };

export type AvatarOption = { type: string; values?: string[]; list?: boolean };
export function styleProperties(theme: string): Record<string, AvatarOption> {
  const definition = STYLES[theme as keyof typeof STYLES] || STYLES.bottts;
  return new OptionsDescriptor(new Style(definition)).toJSON() as Record<string, AvatarOption>;
}

export default function AvatarDisplay({
  theme = "bottts",
  config,
  seed = "Hero",
  fallbackEmoji = "🦁",
  size = 64,
  className = "",
}: AvatarProps) {
  const avatarSvg = useMemo(() => {
    try {
      const activeStyle = STYLES[(theme || "bottts") as keyof typeof STYLES] || STYLES.bottts;
      const parsedOptions: Record<string, unknown> = { seed };
      const properties = styleProperties(theme || "bottts");
      if (config) {
        try {
          const cfg = typeof config === "string" ? JSON.parse(config) as Record<string, unknown> : config as unknown as Record<string, unknown>;
          if (cfg && typeof cfg === "object") {
            const choices = cfg.options;
            if (choices && typeof choices === "object" && !Array.isArray(choices)) {
              for (const [key, value] of Object.entries(choices)) {
                const spec = properties[key];
                if (!spec) continue;
                const allowed = spec.values;
                if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string" && ((spec.type === "enum" && allowed?.includes(value[0])) || (spec.type === "color" && /^[a-fA-F0-9]{6}$/.test(value[0])))) {
                  parsedOptions[key] = value;
                } else if (typeof value === "boolean" && (spec.type === "boolean")) {
                  parsedOptions[key] = value;
                }
              }
            }
            if (!choices && Array.isArray(cfg.baseColor) && properties.baseColor) {
              parsedOptions.baseColor = cfg.baseColor;
            }
            if (cfg.flip === "horizontal" || cfg.flip === "both") parsedOptions.flip = "horizontal";
          }
        } catch { /* invalid saved configuration falls back to seed */ }
      }

      const avatar = new Avatar(new Style(activeStyle), {
        ...parsedOptions,
        size,
      });

      return avatar.toDataUri();
    } catch (err) {
      console.error("Failed to render DiceBear avatar:", err);
      return null;
    }
  }, [theme, config, seed, size]);

  let flip = "none";
  try { const parsed = typeof config === "string" ? JSON.parse(config) : config; flip = parsed?.flip || "none"; } catch { /* legacy configuration */ }
  const vertical = flip === "vertical" || flip === "both";
  let milestoneHalo = false;
  try {
    const cfg = typeof config === "string" ? JSON.parse(config) : config;
    const match = typeof cfg?.frame === "string" ? /^level-([1-9][0-9]*)-halo$/.exec(cfg.frame) : null;
    milestoneHalo = Boolean(match && Number(match[1]) % 10 === 0);
  } catch { /* old config */ }

  if (!avatarSvg) {
    return (
      <div
        style={{ width: size, height: size, fontSize: size * 0.55 }}
        className={`flex items-center justify-center rounded-2xl bg-slate-800 border border-white/10 select-none ${className}`}
      >
        {fallbackEmoji}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-2xl overflow-hidden shrink-0 flex items-center justify-center select-none ${milestoneHalo ? "border-4 border-amber-400 shadow-lg shadow-amber-500/50" : ""} ${className}`}
    >
      <Image
        src={avatarSvg}
        alt="Avatar"
        width={size}
        height={size}
        unoptimized // Necessary for base64 / data URIs
        style={{ transform: vertical ? "scaleY(-1)" : undefined }}
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}