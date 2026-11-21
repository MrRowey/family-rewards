import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, updateMany, createAudit } = vi.hoisted(() => ({
  transaction: vi.fn(),
  updateMany: vi.fn(),
  createAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transaction },
}));

import { PATCH } from "@/app/api/parent/children/kiosk-mode/route";

const childId = "a59ed4e5-2c36-4f43-aaf7-b9803a909c74";

function request(body: unknown) {
  return new Request("http://localhost/api/parent/children/kiosk-mode", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((callback) => callback({
    child: { updateMany },
    auditLog: { create: createAudit },
  }));
});

describe("parent kiosk mode updates", () => {
  it("updates the mode and records the audit event within the same transaction", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    createAudit.mockResolvedValue({});
    const response = await PATCH(request({ childId, kioskMode: "EXPLORER" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, kioskMode: "EXPLORER" });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: childId }, data: { kioskMode: "EXPLORER" } });
    expect(createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "UPDATED_KIOSK_MODE" }) });
  });

  it("returns 404 without creating an audit record for a missing child", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(request({ childId, kioskMode: "TEEN" }));
    expect(response.status).toBe(404);
    expect(createAudit).not.toHaveBeenCalled();
  });

  it("rejects invalid preferences before writing", async () => {
    const response = await PATCH(request({ childId, kioskMode: "ADMIN" }));
    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("fails the request when audit logging fails, allowing the transaction to roll back", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    createAudit.mockRejectedValue(new Error("audit storage unavailable"));
    const response = await PATCH(request({ childId, kioskMode: "JUNIOR" }));
    expect(response.status).toBe(500);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
