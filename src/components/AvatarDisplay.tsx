"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Avatar } from "@dicebear/core";
import bottts from "@dicebear/styles/bottts.json";
import adventurer from "@dicebear/styles/adventurer.json";
import funEmoji from "@dicebear/styles/fun-emoji.json";
import lorelei from "@dicebear/styles/lorelei.json";

interface AvatarProps {
  theme?: string | null;
  config?: string | null;
  seed?: string;
  fallbackEmoji?: string;
  size?: number;
  className?: string;
}

// Strictly typed collection map avoiding 'any'
const STYLES = { bottts, adventurer, funEmoji, lorelei };

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
      let parsedOptions: Record<string, unknown> = { seed };

      if (config) {
        try {
          const cfg = typeof config === "string" ? JSON.parse(config) : config;
          if (cfg && typeof cfg === "object") {
            // App-level avatar choices are not DiceBear style option names.
            const choices = cfg as Record<string, unknown>;
            const color = Array.isArray(choices.baseColor) ? choices.baseColor[0] : undefined;
            if (typeof color === "string" && /^[a-f0-9]{6}$/i.test(color)) {
              parsedOptions.backgroundColor = [color];
            }
            const top = Array.isArray(choices.top) ? choices.top[0] : undefined;
            const eyes = Array.isArray(choices.eyes) ? choices.eyes[0] : undefined;
            if (typeof top === "string" || typeof eyes === "string") {
              parsedOptions.seed = [seed, top, eyes].filter(Boolean).join(":");
            }
          }
        } catch {
          // Fall back to base seed if parsing fails
        }
      }

      const avatar = new Avatar(activeStyle, {
        ...parsedOptions,
        size,
      });

      return avatar.toDataUri();
    } catch (err) {
      console.error("Failed to render DiceBear avatar:", err);
      return null;
    }
  }, [theme, config, seed, size]);

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
      className={`relative rounded-2xl overflow-hidden shrink-0 flex items-center justify-center select-none ${className}`}
    >
      <Image
        src={avatarSvg}
        alt="Avatar"
        width={size}
        height={size}
        unoptimized // Necessary for base64 / data URIs
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}