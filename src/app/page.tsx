"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PinPadModal from "@/components/ui/PinPadModal";
import { Child } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/children");
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
      }
    } catch (err) {
      console.error("Failed to load family data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (!data.isConfigured) {
          router.push("/setup");
        } else {
          loadData();
        }
      })
      .catch((err) => {
        console.error("Failed to fetch config:", err);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-slate-400 animate-pulse">Loading Family Hub...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 select-none">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-white">Family Kiosk</h1>
          <p className="text-slate-400 text-sm mt-1">Tap your profile to view chores & rewards</p>
        </div>
        <button
          onClick={() => setShowPinModal(true)}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-5 py-3 rounded-2xl transition active:scale-95 min-h-12"
        >
          🔒 Parent Mode
        </button>
      </header>

      {children.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center max-w-lg mx-auto">
          <span className="text-6xl">👋</span>
          <h2 className="text-2xl font-black mt-4">Welcome to Family Rewards!</h2>
          <p className="text-slate-400 text-sm mt-2 mb-6">
            No child profiles added yet. Head over to Parent Mode to create your first child profile!
          </p>
          <button
            onClick={() => setShowPinModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 font-black px-6 py-4 rounded-2xl text-white shadow-lg transition active:scale-95 min-h-12"
          >
            Go to Parent Dashboard 🚀
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {children.map((child) => (
            <div
              key={child.id}
              onClick={() => router.push(`/kid/${child.id}`)}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 p-6 rounded-3xl cursor-pointer transition transform hover:-translate-y-1 active:scale-95 shadow-xl"
            >
              <div className="text-5xl mb-4">{child.avatar || "👤"}</div>
              <h3 className="text-2xl font-black">{child.name}</h3>
              <p className="text-indigo-400 font-bold mt-1">⭐ {child.stars} Stars</p>
            </div>
          ))}
        </div>
      )}

      {showPinModal && (
        <PinPadModal
          onSuccess={() => {
            setShowPinModal(false);
            router.push("/parent");
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </main>
  );
}