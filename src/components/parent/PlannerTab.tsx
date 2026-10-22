"use client";

import React, { useState } from "react";
import { Plus, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calculateAgeProfile } from "@/lib/ageRules";
import { Child, Task, TaskAssignmentPayload } from "@/types";

const DAYS_OF_WEEK = [
  { id: 1, label: "Mon", full: "Monday" },
  { id: 2, label: "Tue", full: "Tuesday" },
  { id: 3, label: "Wed", full: "Wednesday" },
  { id: 4, label: "Thu", full: "Thursday" },
  { id: 5, label: "Fri", full: "Friday" },
  { id: 6, label: "Sat", full: "Saturday" },
  { id: 0, label: "Sun", full: "Sunday" },
];

interface PlannerTabProps {
  childrenList: Child[];
  tasks: Task[];
  assignments: TaskAssignmentPayload[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  onToggleAssignment: (taskId: string, dayOfWeek: number) => void;
}

export function PlannerTab({
  childrenList,
  tasks,
  assignments,
  selectedChildId,
  onSelectChild,
  onToggleAssignment,
}: PlannerTabProps) {
  const [addingDayId, setAddingDayId] = useState<number | null>(null);

  const activeChild = childrenList.find((c) => c.id === selectedChildId);
  const ageProfile = activeChild?.dob ? calculateAgeProfile(new Date(activeChild.dob)) : null;

  return (
    <div className="space-y-6">
      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Child:</span>
          <div className="flex gap-2">
            {childrenList.map((c) => (
              <Button
                key={c.id}
                variant={selectedChildId === c.id ? "primary" : "secondary"}
                onClick={() => onSelectChild(c.id)}
              >
                <span>{c.avatar}</span> {c.name}
              </Button>
            ))}
          </div>
        </div>

        {activeChild && ageProfile && (
          <div className="text-right">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              {ageProfile.stageName} ({ageProfile.ageYears} yrs)
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Recommended: Up to {ageProfile.maxDailyTasks} tasks/day</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS_OF_WEEK.map((day) => {
          const dayAssignments = assignments.filter((a) => a.dayOfWeek === day.id);
          const isLimitExceeded = ageProfile ? dayAssignments.length > ageProfile.maxDailyTasks : false;

          return (
            <Card key={day.id} className="p-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                  <span className="font-bold text-sm text-slate-200">{day.label}</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isLimitExceeded ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {dayAssignments.length} / {ageProfile?.maxDailyTasks || 5}
                  </span>
                </div>

                <div className="space-y-2 min-h-35">
                  {dayAssignments.length === 0 ? (
                    <span className="text-[10px] text-slate-600 block text-center py-6">No tasks set</span>
                  ) : (
                    dayAssignments.map((a) => (
                      <div key={a.id} className="bg-slate-800/80 border border-slate-700/80 p-2 rounded-xl flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{a.task.icon}</span> <strong className="truncate text-slate-200">{a.task.title}</strong>
                        </span>
                        <button onClick={() => onToggleAssignment(a.taskId, day.id)} className="text-slate-500 hover:text-red-400 transition ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border-indigo-500/30"
                onClick={() => setAddingDayId(day.id)}
              >
                <Plus className="w-4 h-4" /> Add Task
              </Button>
            </Card>
          );
        })}
      </div>

      {addingDayId !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>📅</span> Add Tasks for {DAYS_OF_WEEK.find((d) => d.id === addingDayId)?.full}
                </h3>
                <p className="text-xs text-slate-400">Select chores for {activeChild?.name}</p>
              </div>
              <Button variant="ghost" onClick={() => setAddingDayId(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {tasks.map((task) => {
                const isAssigned = assignments.some(
                  (a) => a.taskId === task.id && a.dayOfWeek === addingDayId
                );
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onToggleAssignment(task.id, addingDayId)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition min-h-12 ${
                      isAssigned
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-800/50 border-slate-700/70 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{task.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm">{task.title}</h4>
                        <span className="text-[10px] text-amber-400 font-bold">⭐ {task.starValue} Stars</span>
                      </div>
                    </div>

                    {isAssigned ? (
                      <span className="text-xs font-bold bg-indigo-500 text-white px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <Button variant="primary" className="w-full mt-5" onClick={() => setAddingDayId(null)}>
              Done Managing Day
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}