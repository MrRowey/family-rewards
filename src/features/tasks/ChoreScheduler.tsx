"use client";

import { useState } from "react";
import type { ChildProfile, TaskAssignmentItem, TaskItem } from "@/features/admin/types";
import { isAssignmentDue } from "@/lib/domain/schedule";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dragType = "application/x-family-chore";

function isOneOff(entry: TaskAssignmentItem) {
  return !!entry.endDate && entry.startDate.slice(0, 10) === entry.endDate.slice(0, 10);
}

interface Props {
  profiles: ChildProfile[];
  tasks: TaskItem[];
  assignments: TaskAssignmentItem[];
  childId: string;
  setChildId: (id: string) => void;
  addAssignment: (taskId: string, day: number, date?: string) => Promise<void>;
  removeAssignment: (id: string) => Promise<void>;
}

export function ChoreScheduler({ profiles, tasks, assignments, childId, setChildId, addAssignment, removeAssignment }: Props) {
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [view, setView] = useState("week");
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const childAssignments = assignments.filter((entry) => entry.childId === childId);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  async function save(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try { await action(); }
    catch { setMessage("Could not save the schedule change. Try again."); }
    finally { setBusy(false); }
  }

  function dayCard(label: string, weekday: number, entries: TaskAssignmentItem[], date?: string) {
    const unique = new Map(entries.map((entry) => [entry.taskId, entry.task.starValue]));
    const stars = [...unique.values()].reduce((total, value) => total + value, 0);
    const canAdd = !busy && (!date || date >= todayKey);
    function add(taskId: string) {
      if (!canAdd || !tasks.some((task) => task.id === taskId)) return;
      if (entries.some((entry) => entry.taskId === taskId)) {
        setMessage("That chore is already scheduled for this day.");
        return;
      }
      void save(() => addAssignment(taskId, weekday, date));
    }
    return (
      <section key={date ?? label} className="min-w-0 space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-3"
        onDragOver={(event) => { if (canAdd && event.dataTransfer.types.includes(dragType)) event.preventDefault(); }}
        onDrop={(event) => { event.preventDefault(); add(event.dataTransfer.getData(dragType)); }}>
        <header className="flex flex-wrap justify-between gap-1">
          <h4 className="font-semibold">{label}</h4>
          <p className="text-sm text-amber-200">{stars} {stars === 1 ? "star" : "stars"}</p>
        </header>
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-1 rounded-lg bg-slate-800 p-2 text-sm">
            <p className="wrap-break-word">{entry.task.title}</p>
            <p className="text-xs text-slate-300">{entry.task.starValue} stars{date && !isOneOff(entry) ? " · Repeating" : ""}</p>
            {(!date || (date >= todayKey && isOneOff(entry))) && (
              <button type="button" disabled={busy} aria-label={"Remove " + entry.task.title + " from " + label}
                onClick={() => save(() => removeAssignment(entry.id))}
                className="min-h-9 text-xs text-slate-300 underline">Remove</button>
            )}
          </div>
        ))}
        <button type="button" disabled={!canAdd || !selected} onClick={() => add(selected)}
          aria-label={"Add selected chore to " + label}
          className="min-h-11 w-full rounded-lg border border-slate-700 px-2 text-sm disabled:opacity-40">Add chore</button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <label className="grid gap-1 text-sm">Child
          <select value={childId} disabled={busy} onChange={(event) => { setChildId(event.target.value); setMessage(""); }}
            className="min-h-11 rounded-lg bg-slate-900 px-3">
            <option value="">Choose child</option>
            {profiles.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">View
          <select value={view} onChange={(event) => setView(event.target.value)} className="min-h-11 rounded-lg bg-slate-900 px-3">
            <option value="week">Week</option><option value="month">Month</option>
          </select>
        </label>
        {view === "month" && <label className="grid gap-1 text-sm">Month
          <input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }}
            className="min-h-11 rounded-lg bg-slate-900 px-3" />
        </label>}
      </div>
      <section className="space-y-3 rounded-xl border border-slate-800 p-4">
        <h3 className="font-semibold">All Chores</h3>
        <p className="text-sm text-slate-300">Drag a chore onto a day, or select it and use Add chore.</p>
        <ul className="flex flex-wrap gap-2">
          {tasks.map((task) => <li key={task.id}>
            <button type="button" aria-pressed={selected === task.id} draggable={!busy}
              onDragStart={(event) => event.dataTransfer.setData(dragType, task.id)}
              onClick={() => setSelected(task.id)}
              className={"min-h-11 rounded-lg border px-3 text-sm " + (selected === task.id ? "border-sky-400 bg-slate-800" : "border-slate-700 bg-slate-900")}>
              {task.title} <span className="text-amber-200">· {task.starValue} {task.starValue === 1 ? "star" : "stars"}</span>
            </button>
          </li>)}
        </ul>
        {!tasks.length && <p className="text-sm text-slate-400">Add chores in Chore Library first.</p>}
      </section>
      <output className="block text-sm text-amber-200">{message}</output>
      {!childId ? <p>Choose a child to plan their chores.</p> : view === "week" ? (
        <>
          <p className="text-sm text-slate-300">Week edits repeat weekly. Use Month to add chores to a specific date.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekdays.map((label, index) => {
              const day = (index + 1) % 7;
              return dayCard(label, day, childAssignments.filter((entry) =>
                entry.dayOfWeek === day && !isOneOff(entry) && (!entry.endDate || entry.endDate.slice(0, 10) >= todayKey)));
            })}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-300">Month edits apply to a specific date. Edit repeating chores in Week.</p>
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[56rem] grid-cols-7 gap-2">
              {weekdays.map((label) => <p className="text-sm text-slate-300" key={label}>{label}</p>)}
              {Array.from({ length: (first.getUTCDay() + 6) % 7 }, (_, index) => <div key={index} aria-hidden="true" />)}
              {Array.from({ length }, (_, index) => {
                const date = new Date(Date.UTC(year, monthNumber - 1, index + 1));
                const due = childAssignments.filter((entry) => isAssignmentDue({
                  ...entry,
                  startDate: new Date(entry.startDate),
                  endDate: entry.endDate ? new Date(entry.endDate) : null,
                }, date));
                return dayCard(String(index + 1), date.getUTCDay(), due, date.toISOString().slice(0, 10));
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
