import { NextResponse } from "next/server"

export async function POST(req: Request) {
  // later you will validate email/password here
  const token = "JWT_TOKEN"

  const res = NextResponse.json({ success: true })

  res.cookies.set("accessToken", token, {
    path: "/", // 🔥 REQUIRED
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })

  return res
}
