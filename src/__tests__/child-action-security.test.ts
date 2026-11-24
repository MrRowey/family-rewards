import { beforeEach, describe, expect, it, vi } from "vitest";
const { authorised, submit, claim, findCompletions, findRefunds, updateRefund } = vi.hoisted(() => ({
  authorised: vi.fn(), submit: vi.fn(), claim: vi.fn(), findCompletions: vi.fn(), findRefunds: vi.fn(), updateRefund: vi.fn(),
}));
vi.mock("@/lib/kiosk-session", () => ({ isAuthorisedForChild: authorised }));
vi.mock("@/lib/domain/completions", () => ({ submitCompletion: submit, approveCompletion: vi.fn(), declineCompletion: vi.fn() }));
vi.mock("@/lib/domain/redemptions", () => ({ claimReward: claim }));
vi.mock("@/lib/prisma", () => ({ prisma: { completion: { findMany: findCompletions }, rewardRedemption: { findMany: findRefunds, updateMany: updateRefund } } }));
import * as completions from "@/app/api/completions/route";
import * as rewards from "@/app/api/rewards/claim/route";
import * as refunds from "@/app/api/kiosk/refund-requests/route";
const childId = "123e4567-e89b-42d3-a456-426614174000";
const post = (body: unknown) => new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); authorised.mockResolvedValue(false); });
describe("Child-scoped routes", () => {
  it("rejects unauthorised completion reads and writes", async () => {
    expect((await completions.GET(new Request("http://localhost/api?childId=" + childId))).status).toBe(403);
    expect((await completions.POST(post({ childId, taskId: "task" }))).status).toBe(403);
    expect(findCompletions).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
  it("rejects unauthorised reward claims and refund requests", async () => {
    expect((await rewards.POST(post({ childId, rewardId: "reward" }))).status).toBe(403);
    expect((await refunds.GET(new Request("http://localhost/api?childId=" + childId))).status).toBe(403);
    expect((await refunds.POST(post({ childId, redemptionId: childId }))).status).toBe(403);
    expect(claim).not.toHaveBeenCalled();
    expect(findRefunds).not.toHaveBeenCalled();
    expect(updateRefund).not.toHaveBeenCalled();
  });
  it("allows authorised completion submissions and reward claims", async () => {
    authorised.mockResolvedValue(true);
    submit.mockResolvedValue({ id: "completion" });
    claim.mockResolvedValue({ id: "claim" });
    expect((await completions.POST(post({ childId, taskId: "task" }))).status).toBe(201);
    expect((await rewards.POST(post({ childId, rewardId: "reward" }))).status).toBe(201);
    expect(authorised).toHaveBeenCalledWith(childId);
  });
});
