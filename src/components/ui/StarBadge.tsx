"use client";

import React from "react";
import { Star } from "lucide-react";

interface StarBadgeProps {
  stars: number;
  size?: "sm" | "md" | "lg";
}

export function StarBadge({ stars, size = "md" }: StarBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2.5 py-1 gap-1",
    md: "text-sm px-3.5 py-1.5 gap-1.5",
    lg: "text-xl px-5 py-2.5 gap-2",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  return (
    <span
      className={`inline-flex items-center font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-2xl ${sizeClasses[size]}`}
    >
      <Star className={`${iconSizes[size]} fill-amber-400`} />
      {stars}
    </span>
  );
}