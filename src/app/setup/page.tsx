"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldCheck, UserPlus, CheckCircle2, ArrowRight, Trash2 } from "lucide-react";

interface TempChild {
  name: string;
  dob: string;
  avatar: string;
}

interface TempTask {
  title: string;
  starValue: number;
  icon: string;
}

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState("1234");
  const [loading, setLoading] = useState(false);

  // Step 3 State: Children
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [childAvatar, setChildAvatar] = useState("🦁");
  const [childrenList, setChildrenList] = useState<TempChild[]>([]);

  // Step 4 State: Master Tasks
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStars, setTaskStars] = useState(1);
  const [taskIcon, setTaskIcon] = useState("⭐");
  const [taskList, setTaskList] = useState<TempTask[]>([
    { title: "Put Toys in Bin", starValue: 1, icon: "🧸" },
    { title: "Morning Routine", starValue: 3, icon: "☀️" },
  ]);

  const handleAddChild = () => {
    if (!childName || !childDob) return;
    setChildrenList([...childrenList, { name: childName, dob: childDob, avatar: childAvatar }]);
    setChildName("");
    setChildDob("");
  };

  const handleRemoveChild = (index: number) => {
    setChildrenList(childrenList.filter((_, i) => i !== index));
  };

  const handleAddTask = () => {
    if (!taskTitle) return;
    setTaskList([...taskList, { title: taskTitle, starValue: taskStars, icon: taskIcon }]);
    setTaskTitle("");
    setTaskStars(1);
  };

  const handleRemoveTask = (index: number) => {
    setTaskList(taskList.filter((_, i) => i !== index));
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
      // 1. Mark config complete and save parent PIN FIRST
      const configRes = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPin: pin, isConfigured: true }),
      });

      if (!configRes.ok) {
        throw new Error("Failed to save family configuration");
      }

      // 2. Save children to SQLite
      for (const child of childrenList) {
        await fetch("/api/children", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(child),
        });
      }

      // 3. Save vault tasks to SQLite
      for (const task of taskList) {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        });
      }

      // 4. Force hard navigation to main kiosk display
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to complete setup:", err);
      alert("Error saving setup. Check browser terminal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans select-none">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        {/* Progress Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            First-Time Setup — Step {step} of 4
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step ? "bg-indigo-500 w-10" : s < step ? "bg-indigo-900 w-6" : "bg-slate-800 w-6"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Greeting */}
        {step === 1 && (
          <div className="text-center space-y-4 py-4">
            <div className="text-6xl animate-bounce">🌟</div>
            <h1 className="text-3xl font-black">Welcome to Family Rewards!</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your home reward system is up and running. Lets complete a quick 4-step onboarding wizard to set your Parent PIN, add your children, and seed your task vault.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2: Set Parent PIN */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
              <div>
                <h2 className="text-2xl font-bold">Set Parent Security PIN</h2>
                <p className="text-xs text-slate-400">Used to unlock the Parent Dashboard on the touchscreen kiosk</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">4-Digit Security PIN</label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-center text-3xl font-mono tracking-widest py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={pin.length !== 4}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition"
            >
              Next: Add Children <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 3: Add Children */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-indigo-400" />
              <div>
                <h2 className="text-2xl font-bold">Add Family Profiles</h2>
                <p className="text-xs text-slate-400">Add Archie, Rupert, or siblings (you can manage these later in /parent)</p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800 space-y-3">
              <input
                type="text"
                placeholder="Child's Name (e.g. Archie)"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="date"
                value={childDob}
                onChange={(e) => setChildDob(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {["🦁", "🐻", "🦊", "🦕", "🚀", "🦄"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setChildAvatar(e)}
                      className={`text-xl p-1.5 rounded-lg border ${childAvatar === e ? "bg-indigo-600 border-indigo-400" : "bg-slate-800 border-slate-700"}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddChild}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                >
                  + Add Child
                </button>
              </div>
            </div>

            {/* List of configured children */}
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {childrenList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No children added yet. Add at least 1 child to proceed.</p>
              ) : (
                childrenList.map((c, i) => (
                  <div key={i} className="bg-slate-800/80 px-4 py-2.5 rounded-xl flex items-center justify-between text-sm border border-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{c.avatar}</span> <strong>{c.name}</strong>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{c.dob}</span>
                      <button onClick={() => handleRemoveChild(i)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setStep(4)}
              disabled={childrenList.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition"
            >
              Next: Task Vault <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 4: Setup Master Task Vault */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-indigo-400" />
              <div>
                <h2 className="text-2xl font-bold">Seed Task Vault</h2>
                <p className="text-xs text-slate-400">Add starting chores and star reward values</p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Task Title (e.g. Clean Bedroom)"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-1">
                  {["⭐", "🧹", "☀️", "🌙", "🧸"].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setTaskIcon(ic)}
                      className={`p-2 rounded-xl border text-sm ${taskIcon === ic ? "bg-indigo-600 border-indigo-400" : "bg-slate-800 border-slate-700"}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Star Value:</span>
                  {[1, 2, 3, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTaskStars(v)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${taskStars === v ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-slate-800 border-slate-700"}`}
                    >
                      ⭐ {v}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                >
                  + Add Task
                </button>
              </div>
            </div>

            {/* List of configured tasks */}
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {taskList.map((t, i) => (
                <div key={i} className="bg-slate-800/80 px-4 py-2 rounded-xl flex items-center justify-between text-sm border border-slate-700">
                  <span className="flex items-center gap-2">
                    <span>{t.icon}</span> <span>{t.title}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-400">⭐ {t.starValue}</span>
                    <button onClick={() => handleRemoveTask(i)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleFinishSetup}
              disabled={loading || taskList.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" /> {loading ? "Saving Setup..." : "Complete Setup & Launch Kiosk"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}