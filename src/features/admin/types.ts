export type NavigationMenu =
  | "task_approvals"
  | "shop_approvals"
  | "task_vault"
  | "task_scheduler"
  | "shop_items"
  | "shop_group"
  | "shop_visibility"
  | "shop_refunds"
  | "user_children"
  | "admin_settings"
  | "admin_analytics"
  | "admin_audit";

export type SidebarCategory = "approvals" | "vault" | "shop" | "users" | "admin";

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  avatarTheme?: string | null;
  avatarConfig?: string | null;
  stars: number;
  dob: string;
}

export interface SubStepItem {
  id: string;
  title: string;
}

export interface TaskItem {
  category?: string | null;
  id: string;
  title: string;
  icon: string;
  starValue: number;
  subSteps?: SubStepItem[];
}

export interface TaskAssignmentItem {
  id: string;
  childId: string;
  taskId: string;
  dayOfWeek: number;
  repeatInterval: number;
  startDate: string;
  endDate?: string | null;
  task: TaskItem;
  child: ChildProfile;
}

export interface RewardItem {
  category?: string | null;
  imageURL?: string | null;
  id: string;
  title: string;
  description?: string | null;
  icon: string;
  starCost: number;
  monthlyStock: number;
  currentStock: number;
  isGroup: boolean;
  isVisible: boolean;
  targetMonth: number | null;
  assignments?: { childId: string }[];
}

export interface TaskCompletionRecord {
  id: string;
  task?: TaskItem;
  child?: ChildProfile;
}

export interface RewardRedemptionRecord {
  refundState: string | null;
  starCostAtClaim: number | null;
  id: string;
  reward?: RewardItem;
  child?: ChildProfile;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface KioskConfig {
  idleTimeoutSec: number;
  soundEffects: boolean;
  reducedMotion: boolean;
  showPickerStars: boolean;
  maxDailyTasks: number;
}

