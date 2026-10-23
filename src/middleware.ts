import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyParentToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Exclude static assets and public kiosk page routes
  if (
    pathname.startsWith("/setup") ||
    pathname === "/" ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/kid") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const isParentPage = pathname.startsWith("/parent");
  const isParentApi = pathname.startsWith("/api/parent");
  const isApiRoute = pathname.startsWith("/api");

  let requiresAuth = isParentPage || isParentApi;

  // Additional mutation check for generic API routes
  if (isApiRoute && !isParentApi && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const isPublicApiMutation =
      pathname === "/api/auth/verify-pin" ||
      pathname === "/api/completions" ||
      pathname === "/api/rewards/claim" ||
      pathname === "/api/setup";

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