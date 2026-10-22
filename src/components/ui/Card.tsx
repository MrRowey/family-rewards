"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl transition",
          interactive && "cursor-pointer hover:bg-slate-850 hover:border-slate-700 active:scale-95 transform hover:-translate-y-0.5",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
