import { describe, expect, it } from "vitest";
import { isPublicApiMutation } from "./api-permissions";

describe("kiosk API permissions (develop compatibility)", () => {
  it.each(["/api/completions", "/api/task-completions"])("allows submission, not approval: %s", (path) => {
    expect(isPublicApiMutation(path, "POST")).toBe(true);
    for (const method of ["PATCH", "PUT", "DELETE"]) {
      expect(isPublicApiMutation(path, method)).toBe(false);
    }
  });

  it("keeps public reward claims POST-only", () => {
    for (const path of ["/api/rewards/claim", "/api/redemptions", "/api/kiosk/refund-requests"]) {
      expect(isPublicApiMutation(path, "POST")).toBe(true);
      expect(isPublicApiMutation(path, "PATCH")).toBe(false);
    }
  });

  it("permits initial avatar setup but not anonymous purchases", () => {
    expect(isPublicApiMutation("/api/kiosk/avatar", "POST")).toBe(true);
    expect(isPublicApiMutation("/api/kiosk/avatar/purchase", "POST")).toBe(false);
  });

  it("keeps existing-avatar edits public while requiring route-level theme and ownership checks", () => {
    expect(isPublicApiMutation("/api/children/11111111-1111-4111-8111-111111111111/avatar", "PATCH")).toBe(true);
    expect(isPublicApiMutation("/api/children/11111111-1111-4111-8111-111111111111/avatar", "DELETE")).toBe(false);
  });

  it("never permits anonymous parent administration or approvals", () => {
    for (const path of ["/api/approvals", "/api/parent/rewards", "/api/children", "/api/admin/restore"]) {
      for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
        expect(isPublicApiMutation(path, method)).toBe(false);
      }
    }
  });
});
