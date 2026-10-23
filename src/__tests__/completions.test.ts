import { describe, it, expect, beforeEach, vi } from "vitest";

const prismaMock = {
  child: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  task: {
    findUnique: vi.fn(),
  },
  completion: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prismaMock)),
  },
}));

import { submitCompletion, approveCompletion, declineCompletion } from "@/lib/domain/completions";

describe("Completion Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new completion for today", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex" });
    prismaMock.task.findUnique.mockResolvedValue({ id: "t1", title: "Clean Room" });
    prismaMock.completion.findUnique.mockResolvedValue(null);
    prismaMock.completion.create.mockResolvedValue({ id: "comp1", status: "PENDING" });

    const result = await submitCompletion("c1", "t1");

    expect(prismaMock.completion.create).toHaveBeenCalled();
    expect(result).toEqual({ id: "comp1", status: "PENDING" });
  });

  it("should award stars when parent approves completion", async () => {
    prismaMock.completion.findUnique.mockResolvedValue({
      id: "comp1",
      status: "PENDING",
      childId: "c1",
      taskId: "t1",
      task: { title: "Clean Room", starValue: 3 },
      child: { name: "Alex" },
    });
    prismaMock.completion.updateMany.mockResolvedValue({ count: 1 });

    const result = await approveCompletion("comp1");

    expect(prismaMock.child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { stars: { increment: 3 } },
    });
    expect(result).toEqual({ success: true });
  });

  it("should transition status to DECLINED when parent declines", async () => {
    prismaMock.completion.findUnique.mockResolvedValue({
      id: "comp1",
      status: "PENDING",
      childId: "c1",
      taskId: "t1",
      task: { title: "Clean Room", starValue: 3 },
      child: { name: "Alex" },
    });
    prismaMock.completion.updateMany.mockResolvedValue({ count: 1 });

    const result = await declineCompletion("comp1");

    expect(prismaMock.completion.updateMany).toHaveBeenCalledWith({
      where: { id: "comp1", status: "PENDING" },
      data: { status: "DECLINED" },
    });
    expect(result).toEqual({ success: true });
  });
});