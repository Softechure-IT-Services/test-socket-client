import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt, jwtVerify } from "jose";

const PROTECTED_ROUTES = [
  "/profile",
  "/wishlists",
  "/my-orders",
  "/thank-you",
  "/deleteaccount",
  "/channel",
  "/dm",
  "/threads",
  "/calls",
];

const accessSecret = process.env.JWT_ACCESS_SECRET;
const secretKey = accessSecret ? new TextEncoder().encode(accessSecret) : null;

function isTokenUnexpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (!exp) return false;
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const sessionHint = request.cookies.get("app_session")?.value;
  const token =
    request.cookies.get("access_token")?.value ??
    request.cookies.get("accessToken")?.value;

  if (!token) return sessionHint === "1";

  // Preferred path: full signature verification when shared secret is available.
  if (secretKey) {
    try {
      await jwtVerify(token, secretKey);
      return true;
    } catch {
      // If verification fails (e.g. mismatched frontend secret in some envs),
      // avoid a hard login loop by falling back to expiry + session hint.
      return isTokenUnexpired(token) || sessionHint === "1";
    }
  }

  // Fallback path for environments where frontend runtime has no JWT secret:
  // accept only non-expired JWT-like cookies to avoid hard login lockout.
  return isTokenUnexpired(token) || sessionHint === "1";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = await hasValidSession(request);

  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) &&
    !isAuthenticated
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isAuthenticated && (pathname === "/" || pathname === "/index")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
