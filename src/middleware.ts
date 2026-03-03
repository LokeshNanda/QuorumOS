import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, isAdminAuthEnabled, COOKIE_NAME } from "@/lib/session";

const ADMIN_PATHS = ["/admin"];
const ADMIN_API_PATHS = [
  "/api/election/create",
  "/api/election/upload-voters",
  "/api/election/open",
  "/api/election/close",
  "/api/election/schedule",
];

function isAdminPage(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname.startsWith(p));
}

function isAdminApi(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/election/voters")) {
    return method === "GET" || method === "DELETE";
  }
  if (method !== "POST") return false;
  return ADMIN_API_PATHS.some((p) => pathname.startsWith(p));
}

function isProtectedApi(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/election/")) {
    const idMatch = pathname.match(/^\/api\/election\/([^/]+)$/);
    if (idMatch && idMatch[1] !== "list" && idMatch[1] !== "candidates" && idMatch[1] !== "audit") {
      if (method === "GET") return true;
      if (method === "PATCH") return true;
    }
  }
  if (pathname.startsWith("/api/election/candidates") && ["POST", "PATCH", "DELETE"].includes(method))
    return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const needsAdminAuth =
    isAdminPage(pathname) ||
    isAdminApi(pathname, method) ||
    isProtectedApi(pathname, method);

  if (!needsAdminAuth) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (!isAdminAuthEnabled()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const valid = await verifyAdminToken(token);
  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/election/create",
    "/api/election/upload-voters",
    "/api/election/open",
    "/api/election/close",
    "/api/election/schedule",
    "/api/election/:id",
    "/api/election/candidates",
    "/api/election/voters",
  ],
};
