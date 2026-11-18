"use client";

import { RestoreBackup } from "./RestoreBackup";
import { FamilyTrends } from "./FamilyTrends";
import { useState } from "react";
import { AlertCircle, Database } from "lucide-react";
import type { NavigationMenu, ChildProfile, TaskItem, RewardRedemptionRecord, AuditLogRecord } from "./types";

interface AdminInfoSectionsProps {
  activeMenu: NavigationMenu;
  householdChildren: ChildProfile[];
  tasks: TaskItem[];
  redemptionsHistory: RewardRedemptionRecord[];
  auditLogs: AuditLogRecord[];
  onRestore: () => Promise<void>;
}

function formatAction(action: string) {
  return action.toLowerCase().replaceAll("_", " ");
}

export function AdminInfoSections({ activeMenu, householdChildren, tasks, redemptionsHistory, auditLogs, onRestore }: AdminInfoSectionsProps) {
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditDate, setAuditDate] = useState("");
  const actions = [...new Set(auditLogs.map((log) => log.action))].toSorted();
  const search = auditSearch.trim().toLowerCase();
  const start = auditDate ? new Date(auditDate + "T00:00:00") : null;
  const end = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) : null;
  const filteredLogs = auditLogs.filter((log) => {
    const created = new Date(log.createdAt);
    return (!auditAction || log.action === auditAction)
      && (!start || !end || (created >= start && created < end))
      && (log.actor.toLowerCase().includes(search) || log.details.toLowerCase().includes(search));
  });

  return <>
{/* 13. FAMILY ANALYTICS */}
          {activeMenu === "admin_analytics" && (
            <div className="space-y-6">
              <h3 className="font-black text-lg text-white">Household Star Economy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl">
                  <span className="text-xs text-slate-400 font-bold">Total Stars in Circulation</span>
                  <div className="text-4xl font-black text-amber-300 mt-2">
                    {householdChildren.reduce((acc, c) => acc + c.stars, 0)} ⭐
                  </div>
                </div>
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl">
                  <span className="text-xs text-slate-400 font-bold">Active Chores Configured</span>
                  <div className="text-4xl font-black text-indigo-400 mt-2">{tasks.length}</div>
                </div>
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl">
                  <span className="text-xs text-slate-400 font-bold">Prizes Claimed</span>
                  <div className="text-4xl font-black text-emerald-400 mt-2">{redemptionsHistory.length}</div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "admin_analytics" && <FamilyTrends profiles={householdChildren} />}

          {/* 14. BACKUP & RESTORE */}
          {activeMenu === "admin_backup" && (
            <div className="max-w-xl bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl">
              <div>
                <h3 className="font-black text-xl text-white">Database Backup & Export</h3>
                <p className="text-xs text-slate-400 mt-1">Download a JSON snapshot of your family data</p>
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Exports children profiles, chores, recurring schedules, shop prizes, and audit history to prevent data loss.</span>
              </div>

              <a
                href="/api/admin/backup"
                download
                className="w-full flex items-center justify-center gap-2 py-4 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 font-black rounded-2xl text-white shadow-lg shadow-indigo-600/30 transition min-h-[48px] text-xs"
              >
                <Database className="w-4 h-4" /> Export Database Backup (.json)
              </a>
            </div>
          )}

          {activeMenu === "admin_backup" && <RestoreBackup onRestore={onRestore} />}

          {activeMenu === "admin_audit" && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <label className="grid gap-1 text-sm">Search people or details
                  <input type="search" value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)}
                    className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3" />
                </label>
                <label className="grid gap-1 text-sm">Action
                  <select value={auditAction} onChange={(event) => setAuditAction(event.target.value)}
                    className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3">
                    <option value="">All actions</option>
                    {actions.map((action) => <option key={action} value={action}>{formatAction(action)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">Date
                  <input type="date" value={auditDate} onChange={(event) => setAuditDate(event.target.value)}
                    className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3" />
                </label>
              </div>
              <p className="text-sm text-slate-400">Showing {filteredLogs.length} of {auditLogs.length} recent entries (up to 50).</p>
              {filteredLogs.length === 0 ? (
                <p className="rounded-xl border border-slate-800 p-5 text-sm text-slate-300">
                  {auditLogs.length ? "No entries match these filters." : "No activity recorded yet."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>{["When", "Actor", "Action", "Details"].map((heading) => <th key={heading} scope="col" className="p-3 font-semibold">{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="align-top">
                          <td className="whitespace-nowrap p-3 text-slate-400"><time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time></td>
                          <td className="p-3 font-medium text-slate-200">{log.actor}</td>
                          <td className="p-3 capitalize text-slate-300">{formatAction(log.action)}</td>
                          <td className="p-3 text-slate-300">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
  </>;
}
