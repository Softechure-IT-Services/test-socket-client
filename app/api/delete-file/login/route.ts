import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint disabled. Use /auth/login on the backend.",
    },
    { status: 410 }
  )
}
