import Image from "next/image"
import Link from "next/link"
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-3xl px-6">

        {/* Welcome Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to SITS TEAM
        </h1>

        <p className="text-md text-gray-600 mb-6 leading-relaxed">
          Your space to collaborate, share updates, and stay connected.
        </p>

        <p className="text-lg text-gray-700 font-medium mb-10">
          Let's build, solve, and grow—together.
        </p>

      </div>
    </div>
  )
}
