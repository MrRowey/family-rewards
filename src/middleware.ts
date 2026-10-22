import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyParentToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Exclude public static/page routes that don't need auth checks
  if (
    pathname.startsWith("/setup") ||
    pathname === "/" ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const isParentPage = pathname.startsWith("/parent");
  const isApiRoute = pathname.startsWith("/api");

  // Deny-by-default auth logic for not-GET API Requests
  let requiresAuth = isParentPage;

  if (isApiRoute && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    // Explicit public API mutation allow-list:
    const isPublicApiMutation =
      pathname === "/api/auth/verify-pin" ||
      pathname === "/api/completions" ||
      pathname === "/api/rewards/claim" ||
      pathname === "/api/setup"; // Setup checks FamilyConfig.isConfigured directly in route handler

    if (!isPublicApiMutation) {
      requiresAuth = true;
    }
  }

  if (requiresAuth) {
    const token = req.cookies.get("parent_session")?.value;

    if (!token) {
      if (isParentPage) return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    try {
      await verifyParentToken(token);
      return NextResponse.next();
    } catch {
      if (isParentPage) return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/parent/:path*", "/api/:path*"],
};