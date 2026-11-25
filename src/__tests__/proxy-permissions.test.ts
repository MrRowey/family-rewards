import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyParentToken } from "@/lib/auth";
import { proxy } from "@/proxy";

vi.mock("@/lib/auth", () => ({ verifyParentToken: vi.fn() }));

describe("proxy sensitive read permissions", () => {
  it.each(["/api/admin/backup", "/api/approvals", "/api/audit-logs", "/api/redemptions", "/api/assignments", "/api/task-assignments", "/api/completions", "/api/task-completions"])("requires a parent for GET and HEAD on %s", async (path) => {
    for (const method of ["GET", "HEAD"]) {
      const response = await proxy(new NextRequest("http://localhost" + path, { method }));
      expect(response.status).toBe(401);
    }
  });
  it("leaves child-scoped reads to the route's child-session checks", async () => {
    const response = await proxy(new NextRequest("http://localhost/api/assignments?childId=child", { method: "HEAD" }));
    expect(response.status).toBe(200);
  });
});

const routes = [
  "/api/admin/backup",
  "/api/admin/restore",
  "/api/approvals",
  "/api/assignments",
  "/api/audit-logs",
  "/api/auth/logout",
  "/api/auth/verify-pin",
  "/api/bulk-import",
  "/api/children/test-id/avatar",
  "/api/children/test-id/progress",
  "/api/children/test-id/stars",
  "/api/children/adjust-stars",
  "/api/children",
  "/api/completions",
  "/api/config/kiosk",
  "/api/config",
  "/api/health",
  "/api/kiosk/achievements/celebrations",
  "/api/kiosk/avatar/purchase",
  "/api/kiosk/avatar",
  "/api/kiosk/children",
  "/api/kiosk/pending-rewards",
  "/api/kiosk/refund-requests",
  "/api/kiosk/select-child",
  "/api/kiosk/settings",
  "/api/parent/avatar-purchases/refund",
  "/api/parent/avatar-purchases",
  "/api/parent/children/kiosk-mode",
  "/api/parent/children",
  "/api/parent/completions/test-id/reverse",
  "/api/parent/completions/recent",
  "/api/parent/family-stats",
  "/api/parent/pin-reset",
  "/api/parent/pin",
  "/api/parent/progression-settings",
  "/api/parent/rewards",
  "/api/parent/shop-plans",
  "/api/parent/tasks",
  "/api/redemptions/approve",
  "/api/redemptions/refund",
  "/api/redemptions",
  "/api/reward-assignments",
  "/api/rewards/assign",
  "/api/rewards/assignment",
  "/api/rewards/claim",
  "/api/rewards",
  "/api/setup",
  "/api/task-assignments",
  "/api/task-completions",
  "/api/tasks",
  "/api/upload",
  "/api/uploads/test-id",
  "/api/uploads"
];
const publicPosts = new Set(["/api/auth/verify-pin", "/api/completions", "/api/task-completions", "/api/rewards/claim", "/api/kiosk/refund-requests", "/api/redemptions", "/api/setup", "/api/kiosk/avatar", "/api/kiosk/avatar/purchase", "/api/kiosk/select-child", "/api/kiosk/achievements/celebrations"]);

describe("release API mutation permission matrix", () => {
  it.each(routes)("checks every mutation method on %s", async (path) => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const allowed = (method === "POST" && publicPosts.has(path)) || (method === "PATCH" && path === "/api/children/test-id/avatar");
      const response = await proxy(new NextRequest("http://localhost" + path, { method }));
      expect(response.status, method + " " + path).toBe(allowed ? 200 : 401);
    }
  });
  it.each(routes.filter(path => path.startsWith("/api/parent/") || path.startsWith("/api/admin/")))("protects administrative reads on %s", async (path) => {
    for (const method of ["GET", "HEAD"]) {
      expect((await proxy(new NextRequest("http://localhost" + path, { method }))).status).toBe(401);
    }
  });
  it("rejects invalid parent credentials and accepts verified credentials", async () => {
    const request = () => new NextRequest("http://localhost/api/admin/backup", { headers: { cookie: "parent_session=test-token" } });
    vi.mocked(verifyParentToken).mockRejectedValueOnce(new Error("invalid"));
    expect((await proxy(request())).status).toBe(401);
    expect((await proxy(request())).status).toBe(200);
  });
});
