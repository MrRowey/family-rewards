"use client";

import React, { useState } from "react";
import { X, Delete, Lock } from "lucide-react";

interface PinPadModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function PinPadModal({ onSuccess, onClose }: PinPadModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!pin) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Invalid PIN");
        setPin("");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-lg">Parent Verification</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition min-h-12 min-w-12 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl text-center mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-2 mb-6 min-h-6">
          {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border border-slate-700 ${
                i < pin.length ? "bg-indigo-500 border-indigo-400" : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-16 bg-slate-800 hover:bg-slate-700 text-white font-bold text-2xl rounded-2xl transition active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-16 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xl rounded-2xl transition active:scale-95 flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            onClick={() => handleDigit("0")}
            className="h-16 bg-slate-800 hover:bg-slate-700 text-white font-bold text-2xl rounded-2xl transition active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !pin}
            className="h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base rounded-2xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}