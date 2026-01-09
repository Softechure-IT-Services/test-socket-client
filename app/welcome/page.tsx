import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { jwtVerify } from "jose"
import Link from "next/link"

export default async function Welcome() {
  const cookieStore = await cookies() // ✅ await required
  const token = cookieStore.get("accessToken")?.value

  if (token) {
    try {
      await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET)
      )
      redirect("/") // already logged in
    } catch {
      // invalid token → show welcome page
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-3xl px-6">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to SITS TEAM
        </h1>

        <p className="text-xl text-gray-600 mb-6">
          Your space to collaborate, share updates, and stay connected.
        </p>

        <div className="mb-10">
          <Link href="/login">
            <button className="px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-xl">
              Get Started
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
