"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { createAvatar, type Style } from "@dicebear/core";
import { bottts, adventurer, funEmoji, lorelei } from "@dicebear/collection";

interface AvatarProps {
  theme?: string | null;
  config?: string | null;
  seed?: string;
  fallbackEmoji?: string;
  size?: number;
  className?: string;
}

// Strictly typed collection map avoiding 'any'
const STYLES: Record<string, Style<Record<string, unknown>>> = {
  bottts: bottts as Style<Record<string, unknown>>,
  adventurer: adventurer as Style<Record<string, unknown>>,
  funEmoji: funEmoji as Style<Record<string, unknown>>,
  lorelei: lorelei as Style<Record<string, unknown>>,
};

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
      const activeStyle = STYLES[theme || "bottts"] || STYLES.bottts;
      let parsedOptions: Record<string, unknown> = { seed };

      if (config) {
        try {
          const cfg = typeof config === "string" ? JSON.parse(config) : config;
          if (cfg && typeof cfg === "object") {
            parsedOptions = { ...parsedOptions, ...cfg };
          }
        } catch {
          // Fall back to base seed if parsing fails
        }
      }

      const avatar = createAvatar(activeStyle, {
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