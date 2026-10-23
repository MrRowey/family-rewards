import { z } from "zod";

export const CreateChildSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  avatar: z.string().default("🦁"),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date of birth format",
  }),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(100),
  icon: z.string().default("⭐"),
  imageUrl: z.string().url().optional().nullable(),
  starValue: z.number().int().min(1, "Star value must be at least 1").default(1),
  minAge: z.number().int().min(0).default(2),
  maxAge: z.number().int().max(100).default(18),
  subSteps: z.array(z.string().min(1)).optional(),
});

export const CreateRewardSchema = z.object({
  title: z.string().min(1, "Reward title is required").max(100),
  description: z.string().optional().nullable(),
  icon: z.string().default("🎁"),
  imageUrl: z.string().url().optional().nullable(),
  starCost: z.number().int().min(1, "Star cost must be at least 1").default(5),
  monthlyStock: z.number().int().min(1).default(1),
  targetMonth: z.number().int().min(1).max(12).optional().nullable(),
  isGroup: z.boolean().default(false),
});

export const ClaimRewardSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  rewardId: z.string().uuid("Invalid reward ID"),
});

export const SubmitCompletionSchema = z.object({
  childId: z.string().uuid("Invalid child ID"),
  taskId: z.string().uuid("Invalid task ID"),
});