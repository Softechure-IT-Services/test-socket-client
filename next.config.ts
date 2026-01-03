import type { NextConfig } from "next";
const API_URL = process.env.NODE_ENV ? process.env.NEXT_PUBLIC_SERVER_URL : 'http://localhost:8000';

if (!API_URL) {
  throw new Error("API_URL is not defined");
}
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
