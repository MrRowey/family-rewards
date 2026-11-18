import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/restore/route";

const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));

const backup = {
  version: "1.0",
  data: {
    children: [], tasks: [], subSteps: [], rewards: [], assignments: [],
    completions: [], redemptions: [], logs: [],
  },
};

function request(body: unknown) {
  return new Request("http://localhost/api/admin/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.resetAllMocks());

it("previews a legacy backup without changing the database", async () => {
  const response = await POST(request({ backup }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ version: "1.0", summary: { children: 0, shopPlans: 0 } });
  expect(transaction).not.toHaveBeenCalled();
});

it("rejects malformed records even with replacement confirmation", async () => {
  const invalid = { ...backup, data: { ...backup.data, children: [{ id: "child", stars: -1 }] } };
  const response = await POST(request({ backup: invalid, confirmation: "REPLACE FAMILY DATA" }));
  expect(response.status).toBe(400);
  expect(transaction).not.toHaveBeenCalled();
});

it("reports a failed transaction without claiming restoration succeeded", async () => {
  transaction.mockRejectedValueOnce(new Error("foreign key violation"));
  const response = await POST(request({ backup, confirmation: "REPLACE FAMILY DATA" }));
  expect(response.status).toBe(409);
  expect(transaction).toHaveBeenCalledOnce();
});
