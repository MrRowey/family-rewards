import { describe, expect, it } from "vitest";
import { isPublicApiMutation } from "./api-permissions";

describe("public API mutation permissions", () => {
  it.each(["/api/completions", "/api/task-completions"])("allows chore submission but not approval at %s", (path) => {
    expect(isPublicApiMutation(path, "POST")).toBe(true);
    expect(isPublicApiMutation(path, "PATCH")).toBe(false);
    expect(isPublicApiMutation(path, "DELETE")).toBe(false);
    expect(isPublicApiMutation(path, "PUT")).toBe(false);
  });

  it("allows only POST for public claim and refund request routes", () => {
    for (const path of ["/api/rewards/claim", "/api/redemptions", "/api/kiosk/refund-requests"]) {
      expect(isPublicApiMutation(path, "POST")).toBe(true);
      expect(isPublicApiMutation(path, "PATCH")).toBe(false);
    }
  });

  it("never permits parent or approval mutations without authentication", () => {
    for (const path of ["/api/approvals", "/api/parent/rewards", "/api/children", "/api/admin/restore"]) {
      expect(isPublicApiMutation(path, "POST")).toBe(false);
      expect(isPublicApiMutation(path, "PATCH")).toBe(false);
    }
  });
});
