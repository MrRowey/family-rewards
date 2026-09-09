import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-home-kiosk-secret-key-change-me"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  const isParentPage = pathname.startsWith("/parent");
  const isProtectedApi =
    (pathname.startsWith("/api/approvals") ||
      pathname.startsWith("/api/config") ||
      pathname.startsWith("/api/tasks") ||
      pathname.startsWith("/api/rewards")) &&
    ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  if (pathname.startsWith("/setup") || pathname.startsWith("/api/auth/verify-pin")) {
    return NextResponse.next();
  }

  if (isParentPage || isProtectedApi) {
    const token = req.cookies.get("parent_session")?.value;

    if (!token) {
      if (isParentPage) return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (err) {
      if (isParentPage) return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/parent/:path*", "/api/:path*"],
};