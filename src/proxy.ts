import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyParentToken } from "@/lib/auth";
import { isPublicApiMutation } from "@/lib/api-permissions";

const MUTATION_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { method } = req;

  const isParentPage = pathname.startsWith("/parent");
  const isParentApi = pathname.startsWith("/api/parent");
  const isSensitiveRead = method === "GET" && (pathname.startsWith("/api/admin/") || pathname === "/api/approvals" || pathname === "/api/audit-logs" || pathname === "/api/redemptions" || ((pathname === "/api/completions" || pathname === "/api/task-completions") && !req.nextUrl.searchParams.has("childId")));
  const isApiRoute = pathname.startsWith("/api");

  let requiresAuth = isParentPage || isParentApi || isSensitiveRead;

  // Protect any non-whitelisted API mutations
  if (isApiRoute && !isParentApi && MUTATION_METHODS.has(method)) {
    if (!isPublicApiMutation(pathname, method)) {
      requiresAuth = true;
    }
  }

  if (requiresAuth) {
    const token = req.cookies.get("parent_session")?.value;

    if (!token) {
      if (isParentPage) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
      );
    }

    try {
      await verifyParentToken(token);
    } catch {
      if (isParentPage) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return applySecurityHeaders(
        NextResponse.json({ error: "Session expired or invalid" }, { status: 401 })
      );
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/parent/:path*", "/api/:path*"],
};