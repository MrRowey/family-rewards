// Public kiosk writes are deliberately limited by route and HTTP method.
// Keep this method-specific: chore submission must not grant chore approval.
const PUBLIC_POST_ENDPOINTS = new Set([
  "/api/auth/verify-pin",
  "/api/completions",
  "/api/task-completions",
  "/api/rewards/claim",
  "/api/kiosk/refund-requests",
  "/api/redemptions",
  "/api/setup",
  "/api/kiosk/avatar",
  "/api/kiosk/select-child",
]);

export function isPublicApiMutation(pathname: string, method: string): boolean {
  if (method === "POST") return PUBLIC_POST_ENDPOINTS.has(pathname);
  // A child can customise an existing avatar. The handler must enforce
  // ownership and require a parent session for any theme change.
  return method === "PATCH" && /^\/api\/children\/[^/]+\/avatar$/.test(pathname);
}
