"use client";

import { RestoreBackup } from "./RestoreBackup";
import { FamilyTrends } from "./FamilyTrends";
import { useState } from "react";
import { Database } from "lucide-react";
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

          {activeMenu === "admin_settings" && (
            <section aria-labelledby="backup-settings-heading" className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <h3 id="backup-settings-heading" className="text-lg font-semibold">Backup &amp; Restore</h3>
              <div className="grid items-start gap-5 lg:grid-cols-2">
                <section className="min-w-0 space-y-3 rounded-xl border border-slate-800 p-5">
                  <h4 className="font-semibold">Export family data</h4>
                  <p className="text-sm text-slate-300">Download a JSON backup of profiles, chores, schedules, rewards, and activity. Keep a separate copy of uploaded photos.</p>
                  <a href="/api/admin/backup" download className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-900">
                    <Database size={16} /> Download backup
                  </a>
                </section>
                <RestoreBackup onRestore={onRestore} />
              </div>
            </section>
          )}

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
