import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ownerOnlyRoutes = ["/forecasting", "/reports", "/users"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isLoginPage = nextUrl.pathname === "/login";

  // Redirect logged-in users away from the login page
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Allow access to the login page
  if (isLoginPage) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Owner-only route protection
  const isOwnerOnly = ownerOnlyRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  if (isOwnerOnly && req.auth?.user?.role !== "OWNER") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/forecasting/:path*",
    "/reports/:path*",
    "/alerts/:path*",
    "/users/:path*",
  ],
};
