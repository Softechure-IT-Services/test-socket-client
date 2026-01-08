import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ROUTES = ["/", "/login", "/signup"];


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Allow public pages & static files
  if (
    PUBLIC_ROUTES.some(route => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt")
  ) {
    return NextResponse.next();
  }

  // ✅ Read JWT from cookie
  const token = req.cookies.get("access_token")?.value;

  // ❌ No token → redirect
  if (!token) {
    return pathname.startsWith("/api")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // ✅ Verify JWT
    await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)
    );

    return NextResponse.next();
  } catch (error) {
    console.log("JWT verification failed");

    // ❗ Do NOT clear cookies here
    return pathname.startsWith("/api")
      ? NextResponse.json({ error: "Invalid token" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }
}

// ✅ Apply middleware to all routes except static & api
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
