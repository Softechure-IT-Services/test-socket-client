import { Geist, Geist_Mono } from "next/font/google"
import "@/app/globals.css"
  import { Toaster } from "@/app/components/ui/sonner"
import { AuthProvider } from "@/app/components/context/userId_and_connection/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AuthProvider>
        {children}
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
