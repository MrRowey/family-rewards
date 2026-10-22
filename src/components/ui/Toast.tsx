"use client";

import React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border border-slate-700 px-5 py-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-5">
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-400" />
      )}
      <span className="text-sm font-bold text-slate-100">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-white p-1 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}