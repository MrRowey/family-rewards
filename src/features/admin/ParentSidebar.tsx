"use client";

import { Shield, ChevronDown, CheckSquare, Gift, Layers, Calendar, Users2, Eye, RotateCcw, Users, Sparkles, KeyRound, Sliders, BarChart3, Database, FileText, RefreshCw, LogOut } from "lucide-react";
import type { NavigationMenu, SidebarCategory } from "./types";

interface ParentSidebarProps {
  activeMenu: NavigationMenu;
  setActiveMenu: (menu: NavigationMenu) => void;
  collapsedCategories: Record<SidebarCategory, boolean>;
  toggleCategory: (category: SidebarCategory) => void;
  pendingTasksCount: number;
  pendingRedemptionsCount: number;
  totalPending: number;
  loadPortalData: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

export function ParentSidebar({ activeMenu, setActiveMenu, collapsedCategories, toggleCategory, pendingTasksCount, pendingRedemptionsCount, totalPending, loadPortalData, handleLogout }: ParentSidebarProps) {
  return (
<aside className="w-72 shrink-0 bg-slate-900/70 backdrop-blur-xl border-r border-white/10 flex flex-col justify-between p-4 z-20 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-white">Parent Hub</h1>
              <p className="text-[11px] text-slate-400 font-medium">Control Center</p>
            </div>
          </div>

          <nav className="space-y-2.5 text-xs font-bold">
            {/* 1. Approvals Category */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleCategory("approvals")}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] uppercase font-black tracking-wider text-slate-400 hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <span>Approvals</span>
                  {totalPending > 0 && (
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {totalPending}
                    </span>
                  )}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsedCategories.approvals ? "-rotate-90" : "rotate-0"}`} />
              </button>

              {!collapsedCategories.approvals && (
                <div className="p-1.5 pt-0 space-y-1">
                  <button
                    onClick={() => setActiveMenu("task_approvals")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "task_approvals"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Task Approvals</span>
                    {pendingTasksCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">{pendingTasksCount}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveMenu("shop_approvals")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "shop_approvals"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2"><Gift className="w-4 h-4" /> Shop Requests</span>
                    {pendingRedemptionsCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">{pendingRedemptionsCount}</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 2. Task Vault Category */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleCategory("vault")}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] uppercase font-black tracking-wider text-slate-400 hover:text-white transition"
              >
                <span>Task Vault</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsedCategories.vault ? "-rotate-90" : "rotate-0"}`} />
              </button>

              {!collapsedCategories.vault && (
                <div className="p-1.5 pt-0 space-y-1">
                  <button
                    onClick={() => setActiveMenu("task_vault")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "task_vault"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Layers className="w-4 h-4" /> Master Task Vault
                  </button>
                  <button
                    onClick={() => setActiveMenu("task_scheduler")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "task_scheduler"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Calendar className="w-4 h-4" /> Task Scheduler
                  </button>
                </div>
              )}
            </div>

            {/* 3. Shop Category */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleCategory("shop")}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] uppercase font-black tracking-wider text-slate-400 hover:text-white transition"
              >
                <span>Shop</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsedCategories.shop ? "-rotate-90" : "rotate-0"}`} />
              </button>

              {!collapsedCategories.shop && (
                <div className="p-1.5 pt-0 space-y-1">
                  <button
                    onClick={() => setActiveMenu("shop_items")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "shop_items"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Gift className="w-4 h-4" /> Shop Items
                  </button>
                  <button
                    onClick={() => setActiveMenu("shop_group")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "shop_group"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Users2 className="w-4 h-4" /> Group Goals
                  </button>
                  <button
                    onClick={() => setActiveMenu("shop_visibility")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "shop_visibility"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Eye className="w-4 h-4" /> Visibility Matrix
                  </button>
                  <button
                    onClick={() => setActiveMenu("shop_refunds")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "shop_refunds"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" /> Shop Refunds
                  </button>
                </div>
              )}
            </div>

            {/* 4. Users Category */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleCategory("users")}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] uppercase font-black tracking-wider text-slate-400 hover:text-white transition"
              >
                <span>Users</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsedCategories.users ? "-rotate-90" : "rotate-0"}`} />
              </button>

              {!collapsedCategories.users && (
                <div className="p-1.5 pt-0 space-y-1">
                  <button
                    onClick={() => setActiveMenu("user_children")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "user_children"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Users className="w-4 h-4" /> Child Profiles
                  </button>
                  <button
                    onClick={() => setActiveMenu("user_adjust")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "user_adjust"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" /> Balance Adjust
                  </button>
                  <button
                    onClick={() => setActiveMenu("user_pin")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "user_pin"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <KeyRound className="w-4 h-4" /> Reset PIN
                  </button>
                </div>
              )}
            </div>

            {/* 5. Admin Category */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleCategory("admin")}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] uppercase font-black tracking-wider text-slate-400 hover:text-white transition"
              >
                <span>Admin</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsedCategories.admin ? "-rotate-90" : "rotate-0"}`} />
              </button>

              {!collapsedCategories.admin && (
                <div className="p-1.5 pt-0 space-y-1">
                  <button
                    onClick={() => setActiveMenu("admin_display")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "admin_display"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Sliders className="w-4 h-4" /> Kiosk Display
                  </button>
                  <button
                    onClick={() => setActiveMenu("admin_analytics")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "admin_analytics"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" /> Family Stats
                  </button>
                  <button
                    onClick={() => setActiveMenu("admin_backup")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "admin_backup"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Database className="w-4 h-4" /> Backup & Data
                  </button>
                  <button
                    onClick={() => setActiveMenu("admin_audit")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition min-h-[38px] ${
                      activeMenu === "admin_audit"
                        ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Audit Log
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="space-y-2 pt-3 border-t border-white/5">
          <button
            onClick={loadPortalData}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950/60 hover:bg-slate-800 border border-white/10 rounded-2xl text-xs font-bold text-slate-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" /> Refresh Data
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-black transition"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" /> Return to Kiosk
          </button>
        </div>
      </aside>
  );
}
