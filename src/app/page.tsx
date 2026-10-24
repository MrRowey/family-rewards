"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, Star, ChevronRight, User } from "lucide-react";
import PinPadModal from "@/components/ui/PinPadModal";
import { Child } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      setCurrentDate(
        now.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="font-extrabold tracking-wide text-slate-400 animate-pulse text-lg">
          Loading Family Hub...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 p-6 sm:p-10 select-none touch-manipulation flex flex-col justify-between">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/15 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 right-10 w-[500px] h-[300px] bg-amber-500/10 blur-[130px] rounded-full" />

      {/* Top Bar */}
      <header className="relative z-10 flex justify-between items-center bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 sm:p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Family Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Tap your profile to start earning stars
            </p>
          </div>
        </div>

        {/* Live Clock & Parent Mode Button */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex flex-col items-end border-r border-slate-800 pr-6">
            <span className="text-2xl font-black tracking-tight text-slate-200">
              {currentTime}
            </span>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {currentDate}
            </span>
          </div>

          <button
            onClick={() => setShowPinModal(true)}
            className="group flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 font-bold px-4 sm:px-5 py-3 rounded-2xl transition-all active:scale-95 shadow-md min-h-[48px]"
            aria-label="Parent Mode"
          >
            <Lock className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span className="text-sm">Parent Mode</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <section className="relative z-10 my-auto py-8">
        {children.length === 0 ? (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-10 sm:p-14 rounded-3xl text-center max-w-lg mx-auto shadow-2xl">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">👋</span>
            </div>
            <h2 className="text-3xl font-black text-white">Welcome!</h2>
            <p className="text-slate-400 text-base mt-2 mb-8 leading-relaxed">
              No child profiles found yet. Switch over to Parent Mode to set up your family chores and reward cards.
            </p>
            <button
              onClick={() => setShowPinModal(true)}
              className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-black px-6 py-4 rounded-2xl text-white shadow-xl shadow-indigo-600/30 transition-all active:scale-95 min-h-[52px] text-lg flex items-center justify-center gap-2"
            >
              Open Parent Dashboard <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Who is checking in?
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Select your avatar to view today&apos;s quests
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/kid/${child.id}`)}
                  className="group relative bg-slate-900/70 hover:bg-slate-850/80 active:bg-slate-800/90 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 p-7 rounded-3xl transition-all duration-300 transform hover:-translate-y-1.5 active:scale-[0.98] shadow-2xl flex flex-col items-center text-center overflow-hidden min-h-[220px]"
                >
                  {/* Subtle top edge highlight */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-indigo-500/40 to-transparent group-hover:via-indigo-400 transition-opacity" />

                  {/* Avatar rendering */}
                  <div className="relative mb-4 mt-2">
                    {child.avatar && child.avatar.startsWith("/") ? (
                      <div className="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-indigo-500/20 group-hover:ring-indigo-500/50 shadow-xl transition-all">
                        <Image
                          src={child.avatar}
                          alt={child.name}
                          width={96}
                          height={96}
                          unoptimized
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : child.avatar ? (
                      <div className="w-24 h-24 rounded-3xl bg-slate-800/70 border border-white/10 flex items-center justify-center text-6xl shadow-xl group-hover:scale-105 transition-transform duration-300">
                        {child.avatar}
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-slate-800/70 border border-white/10 flex items-center justify-center shadow-xl">
                        <User className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                    {child.name}
                  </h3>

                  {/* Star Badge */}
                  <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-full shadow-inner">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-base font-black text-amber-300">
                      {child.stars} {child.stars === 1 ? "Star" : "Stars"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Footer / Status bar */}
      <footer className="relative z-10 flex justify-between items-center text-xs text-slate-500 font-semibold px-2 py-4">
        <span>Family Rewards Kiosk v1.0</span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Kiosk Online
        </span>
      </footer>

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