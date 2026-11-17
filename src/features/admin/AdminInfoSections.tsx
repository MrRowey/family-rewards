"use client";

import { AlertCircle, Database } from "lucide-react";
import type { NavigationMenu, ChildProfile, TaskItem, RewardRedemptionRecord, AuditLogRecord } from "./types";

interface AdminInfoSectionsProps {
  activeMenu: NavigationMenu;
  householdChildren: ChildProfile[];
  tasks: TaskItem[];
  redemptionsHistory: RewardRedemptionRecord[];
  auditLogs: AuditLogRecord[];
}

export function AdminInfoSections({ activeMenu, householdChildren, tasks, redemptionsHistory, auditLogs }: AdminInfoSectionsProps) {
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

          {/* 15. AUDIT LOG */}
          {activeMenu === "admin_audit" && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-3 shadow-xl">
              <h3 className="font-black text-lg text-white mb-4">System Audit Trail</h3>
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-xs font-semibold">No audit logs recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-950/80 border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-black text-indigo-400 mr-2">[{log.actor}]</span>
                      <span className="text-slate-300">{log.details}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        
  </>;
}
