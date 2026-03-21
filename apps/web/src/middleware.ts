import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Better Auth uses __Secure- prefix when baseURL is https://
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

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
