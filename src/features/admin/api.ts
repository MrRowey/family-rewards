import type {
  ChildProfile, TaskItem, TaskAssignmentItem, RewardItem,
  TaskCompletionRecord, RewardRedemptionRecord, AuditLogRecord, KioskConfig,
} from "./types";

export interface ParentPortalData {
  children?: ChildProfile[];
  tasks?: TaskItem[];
  rewards?: RewardItem[];
  assignments?: TaskAssignmentItem[];
  pendingTasks?: TaskCompletionRecord[];
  pendingRedemptions?: RewardRedemptionRecord[];
  redemptionsHistory?: RewardRedemptionRecord[];
  auditLogs?: AuditLogRecord[];
  kioskConfig?: KioskConfig;
}

async function fetchJson(url: string): Promise<unknown | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return await response.json() as unknown;
  } catch (error) {
    console.error(`Failed to load ${url}`, error);
    return undefined;
  }
}

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function isKioskConfig(value: unknown): value is KioskConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return typeof config.idleTimeoutSec === "number"
    && typeof config.soundEffects === "boolean"
    && typeof config.maxDailyTasks === "number";
}

export async function fetchParentPortalData(month: number): Promise<ParentPortalData> {
  const [children, tasks, rewards, assignments, pendingTasks, pendingRedemptions,
    redemptionsHistory, auditLogs, kioskConfig] = await Promise.all([
    fetchJson("/api/children"),
    fetchJson("/api/tasks"),
    fetchJson(`/api/rewards?month=${month}`),
    fetchJson("/api/task-assignments"),
    fetchJson("/api/task-completions?status=PENDING"),
    fetchJson("/api/redemptions?status=PENDING"),
    fetchJson("/api/redemptions"),
    fetchJson("/api/audit-logs"),
    fetchJson("/api/kiosk/settings"),
  ]);

  return {
    ...(children !== undefined && { children: asList<ChildProfile>(children) }),
    ...(tasks !== undefined && { tasks: asList<TaskItem>(tasks) }),
    ...(rewards !== undefined && { rewards: asList<RewardItem>(rewards) }),
    ...(assignments !== undefined && { assignments: asList<TaskAssignmentItem>(assignments) }),
    ...(pendingTasks !== undefined && { pendingTasks: asList<TaskCompletionRecord>(pendingTasks) }),
    ...(pendingRedemptions !== undefined && { pendingRedemptions: asList<RewardRedemptionRecord>(pendingRedemptions) }),
    ...(redemptionsHistory !== undefined && { redemptionsHistory: asList<RewardRedemptionRecord>(redemptionsHistory) }),
    ...(auditLogs !== undefined && { auditLogs: asList<AuditLogRecord>(auditLogs) }),
    ...(isKioskConfig(kioskConfig) && { kioskConfig }),
  };
}
