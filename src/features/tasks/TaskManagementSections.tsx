"use client";

import type React from "react";
import { Calendar, Plus, X } from "lucide-react";
import type { NavigationMenu, ChildProfile, TaskItem, TaskAssignmentItem } from "@/features/admin/types";

interface TaskManagementSectionsProps {
  activeMenu: NavigationMenu;
  tasks: TaskItem[];
  householdChildren: ChildProfile[];
  assignments: TaskAssignmentItem[];
  taskTitle: string;
  setTaskTitle: (value: string) => void;
  taskIcon: string;
  setTaskIcon: (value: string) => void;
  taskStarValue: number;
  setTaskStarValue: (value: number) => void;
  taskSubSteps: string[];
  setTaskSubSteps: (value: string[]) => void;
  schedChildId: string;
  setSchedChildId: (value: string) => void;
  schedTaskId: string;
  setSchedTaskId: (value: string) => void;
  schedDay: number;
  setSchedDay: (value: number) => void;
  schedInterval: number;
  setSchedInterval: (value: number) => void;
  handleCreateTask: (event: React.FormEvent) => Promise<void>;
  handleScheduleTask: (event: React.FormEvent) => Promise<void>;
  handleDeleteAssignment: (id: string) => Promise<void>;
}

export function TaskManagementSections({ activeMenu, tasks, householdChildren, assignments, taskTitle, setTaskTitle, taskIcon, setTaskIcon, taskStarValue, setTaskStarValue, taskSubSteps, setTaskSubSteps, schedChildId, setSchedChildId, schedTaskId, setSchedTaskId, schedDay, setSchedDay, schedInterval, setSchedInterval, handleCreateTask, handleScheduleTask, handleDeleteAssignment }: TaskManagementSectionsProps) {
  return <>
{/* 3. TASK VAULT CREATION */}
          {activeMenu === "task_vault" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleCreateTask} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl h-fit">
                <h3 className="text-base font-black flex items-center gap-2 text-white">
                  <Plus className="w-4 h-4 text-indigo-400" /> Create Master Chore
                </h3>
                <div>
                  <label htmlFor="a11y-parent-page-tsx-1" className="block text-xs font-bold text-slate-400 mb-1">Title</label>
                  <input id="a11y-parent-page-tsx-1"
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                    placeholder="e.g. Put Away Laundry"
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-2" className="block text-xs font-bold text-slate-400 mb-1">Icon Emoji</label>
                    <input id="a11y-parent-page-tsx-2"
                      type="text"
                      value={taskIcon}
                      onChange={(e) => setTaskIcon(e.target.value)}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center text-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-3" className="block text-xs font-bold text-slate-400 mb-1">Star Award</label>
                    <input id="a11y-parent-page-tsx-3"
                      type="number"
                      value={taskStarValue}
                      onChange={(e) => setTaskStarValue(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-center font-bold text-amber-300"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label htmlFor="a11y-parent-page-tsx-4" className="block text-xs font-bold text-slate-400">Sub-Steps (Optional)</label>
                  {taskSubSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const updated = [...taskSubSteps];
                          updated[idx] = e.target.value;
                          setTaskSubSteps(updated);
                        }}
                        placeholder={`Step ${idx + 1}`}
                        className="flex-1 bg-slate-950/80 border border-white/10 p-2.5 rounded-xl text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setTaskSubSteps(taskSubSteps.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTaskSubSteps([...taskSubSteps, ""])}
                    className="text-xs font-extrabold text-indigo-400"
                  >
                    + Add Step
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 font-black py-3 rounded-2xl text-xs text-white shadow-lg shadow-indigo-600/30 transition min-h-[46px]"
                >
                  Save to Master Vault
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Master Chores ({tasks.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-5 rounded-3xl space-y-2 shadow-lg">
                      <div className="flex justify-between items-start">
                        <span className="text-4xl">{task.icon}</span>
                        <span className="text-xs font-black bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full">
                          +{task.starValue} Stars
                        </span>
                      </div>
                      <h4 className="font-black text-base text-white">{task.title}</h4>
                      {task.subSteps && task.subSteps.length > 0 && (
                        <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-white/5">
                          {task.subSteps.map((st) => (
                            <p key={st.id}>• {st.title}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. TASK SCHEDULER */}
          {activeMenu === "task_scheduler" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleScheduleTask} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl h-fit">
                <h3 className="text-base font-black flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4 text-indigo-400" /> Schedule Chore Cadence
                </h3>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-4" className="block text-xs font-bold text-slate-400 mb-1">Select Child</label>
                  <select id="a11y-parent-page-tsx-4"
                    value={schedChildId}
                    onChange={(e) => setSchedChildId(e.target.value)}
                    required
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  >
                    <option value="">-- Choose Child --</option>
                    {householdChildren.map((c) => (
                      <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="a11y-parent-page-tsx-5" className="block text-xs font-bold text-slate-400 mb-1">Select Master Task</label>
                  <select id="a11y-parent-page-tsx-5"
                    value={schedTaskId}
                    onChange={(e) => setSchedTaskId(e.target.value)}
                    required
                    className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                  >
                    <option value="">-- Choose Chore --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.icon} {t.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-6" className="block text-xs font-bold text-slate-400 mb-1">Day of Week</label>
                    <select id="a11y-parent-page-tsx-6"
                      value={schedDay}
                      onChange={(e) => setSchedDay(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                    >
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, idx) => (
                        <option key={d} value={idx}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="a11y-parent-page-tsx-7" className="block text-xs font-bold text-slate-400 mb-1">Recurrence</label>
                    <select id="a11y-parent-page-tsx-7"
                      value={schedInterval}
                      onChange={(e) => setSchedInterval(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-white/10 p-3 rounded-2xl text-xs text-white"
                    >
                      <option value={1}>Every Week</option>
                      <option value={2}>Every 2 Weeks</option>
                      <option value={3}>Every 3 Weeks</option>
                      <option value={4}>Monthly (Every 4 Wks)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 font-black py-3 rounded-2xl text-xs text-white shadow-lg shadow-indigo-600/30 transition min-h-[46px]"
                >
                  Save Schedule Rule
                </button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Active Recurring Schedules ({assignments.length})</h3>
                <div className="space-y-3">
                  {assignments.map((asgn) => {
                    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    return (
                      <div key={asgn.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center justify-between text-xs shadow-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{asgn.task.icon}</span>
                          <div>
                            <h4 className="font-black text-sm text-white">{asgn.task.title}</h4>
                            <p className="text-slate-400">
                              Assigned to: <strong className="text-indigo-300">{asgn.child.name}</strong> • Repeats: <strong className="text-amber-300">{days[asgn.dayOfWeek]}</strong> ({asgn.repeatInterval === 1 ? "Weekly" : `Every ${asgn.repeatInterval} weeks`})
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAssignment(asgn.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          
  </>;
}
