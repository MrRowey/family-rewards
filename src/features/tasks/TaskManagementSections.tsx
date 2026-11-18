"use client";

import { groupByCategory } from "@/features/admin/groupByCategory";
import { CreateDialog } from "@/features/admin/CreateDialog";
import { ChoreScheduler } from "./ChoreScheduler";
import type React from "react";
import { X } from "lucide-react";
import type { NavigationMenu, ChildProfile, TaskItem, TaskAssignmentItem } from "@/features/admin/types";

interface TaskManagementSectionsProps {
  activeMenu: NavigationMenu;
  tasks: TaskItem[];
  taskSaveError: string;
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
  handleCreateTask: (event: React.FormEvent) => Promise<void>;
  handleScheduleTask: (taskId: string, day: number, date?: string) => Promise<void>;
  handleDeleteAssignment: (id: string) => Promise<void>;
}

export function TaskManagementSections({ activeMenu, tasks, taskSaveError, householdChildren, assignments, taskTitle, setTaskTitle, taskIcon, setTaskIcon, taskStarValue, setTaskStarValue, taskSubSteps, setTaskSubSteps, schedChildId, setSchedChildId, handleCreateTask, handleScheduleTask, handleDeleteAssignment }: TaskManagementSectionsProps) {
  return <>
{/* 3. TASK VAULT CREATION */}
          {activeMenu === "task_vault" && (
            <div className="space-y-5">
              <CreateDialog label="Add Chore">
              <form onSubmit={handleCreateTask} className="space-y-4">
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
                <label className="block space-y-1 text-sm text-slate-300">
                  <span>Category (optional)</span>
                  <input name="category" maxLength={60} className="block w-full rounded-lg border border-slate-700 bg-slate-950 p-2" />
                </label>
                <output className="block text-sm text-amber-200">{taskSaveError}</output>
              </form>
              </CreateDialog>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-black text-lg text-white">Master Chores ({tasks.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupByCategory(tasks).map(([category, entries]) => (
                <div className="contents" key={category}>
                  <h4 className="col-span-full text-sm font-semibold text-slate-300">{category}</h4>
                  {entries.map((task) => (
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
                ))}
                </div>
              </div>
            </div>
          )}

          {activeMenu === "task_scheduler" && <ChoreScheduler profiles={householdChildren} tasks={tasks} assignments={assignments}
            childId={schedChildId} setChildId={setSchedChildId} addAssignment={handleScheduleTask} removeAssignment={handleDeleteAssignment} />}

  </>;
}
