export type AgeTier = "toddler" | "primary" | "teen";

export interface Child {
  id: string;
  name: string;
  avatar: string;
  stars: number;
  dob?: string;
  ageTier?: AgeTier;
  stageName?: string;
}

export interface Task {
  id: string;
  title: string;
  icon: string;
  starValue: number;
  minAge: number;
  maxAge: number;
}

export interface Completion {
  id: string;
  childId: string;
  taskId: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  forDate: string;
  task?: Task;
}

export interface RewardAssignment {
  id: string;
  childId: string;
  rewardId: string;
}

export interface Reward {
  id: string;
  title: string;
  icon: string;
  starCost: number;
  monthlyStock: number;
  currentStock: number;
  minAge: number;
  maxAge: number;
  assignments?: RewardAssignment[];
}

export interface PendingApproval {
  id: string;
  child: Child;
  task?: Task;
  reward?: Reward;
  completedAt?: string;
  requestedAt?: string;
}

export interface TaskAssignmentPayload {
  id: string;
  childId: string;
  taskId: string;
  dayOfWeek: number;
  task: Task;
}