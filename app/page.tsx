
import Image from "next/image"

export default function Welcome() {
  return (
    <div className=" flex flex-col justify-center items-center w-full h-full ">
      <div className="text-center max-w-2xl px-6">
        

        {/* Welcome Message */}
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to SITS TEAM
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          Your space to collaborate, share updates, and stay connected.
        </p>

        <p className="text-lg text-gray-700 font-medium mb-12">
          Let's build, solve, and grow—together.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Collaborate</h3>
            <p className="text-sm text-gray-600">Work together seamlessly with your team</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Share Updates</h3>
            <p className="text-sm text-gray-600">Keep everyone in the loop instantly</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Grow Together</h3>
            <p className="text-sm text-gray-600">Build success as a unified team</p>
          </div>
        </div>
      </div>
    </div>
  )
}