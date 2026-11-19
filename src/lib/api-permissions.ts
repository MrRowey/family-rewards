// Public kiosk writes are deliberately limited by both route and HTTP method.
// Parent approvals, profile edits and administrative actions must never be public.
const PUBLIC_POST_ENDPOINTS = new Set([
  "/api/auth/verify-pin",
  "/api/completions",
  "/api/task-completions",
  "/api/rewards/claim",
  "/api/kiosk/refund-requests",
  "/api/redemptions",
  "/api/setup",
]);

export function isPublicApiMutation(pathname: string, method: string): boolean {
  return method === "POST" && PUBLIC_POST_ENDPOINTS.has(pathname);
}
