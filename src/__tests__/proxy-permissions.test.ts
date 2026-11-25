import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
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
