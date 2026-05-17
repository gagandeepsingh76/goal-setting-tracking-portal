import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/dashboard",
  "/goals",
  "/approvals",
  "/team",
  "/admin",
  "/reports"
];

function usesSecureCookies(request: NextRequest) {
  const authUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL;

  if (authUrl) {
    return authUrl.startsWith("https://");
  }

  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret:
      process.env.AUTH_SECRET ??
      process.env.NEXTAUTH_SECRET,
    secureCookie: usesSecureCookies(request)
  });

  // Not logged in
  if (!token?.id || !token.role) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = String(token.role || "");

  // Admin routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Manager/Admin routes
  if (
    (pathname.startsWith("/approvals") ||
      pathname.startsWith("/team")) &&
    !["MANAGER", "ADMIN"].includes(role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/goals/:path*", "/approvals/:path*", "/team/:path*", "/admin/:path*", "/reports/:path*"]
};
