import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dash") ||
    request.nextUrl.pathname.startsWith("/onboard");

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dash/:path*", "/onboard/:path*"],
};
