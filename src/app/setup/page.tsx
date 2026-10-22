"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, ArrowRight } from "lucide-react";

export default function FirstTimeSetup() {
  const router = useRouter();

  const [pinLength, setPinLength] = useState<number>(4);
  const [parentPin, setParentPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parentPin.length !== pinLength) {
      setError(`Your security PIN must be exactly ${pinLength} digits long.`);
      return;
    }

    if (parentPin !== confirmPin) {
      setError("PINs do not match. Please verify your PIN entry.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: parentPin }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save setup configuration.");
      }
    } catch {
      setError("Network error during setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Initial Setup</h1>
            <p className="text-xs text-slate-400">Set up parent PIN to secure configuration</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSetup} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">
              PIN Length: {pinLength} Digits
            </label>
            <input
              type="range"
              min={4}
              max={8}
              value={pinLength}
              onChange={(e) => {
                setPinLength(Number(e.target.value));
                setParentPin("");
                setConfirmPin("");
              }}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Enter Parent PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={pinLength}
              value={parentPin}
              onChange={(e) => setParentPin(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Confirm Parent PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={pinLength}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-4 rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" /> Save Security PIN <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}