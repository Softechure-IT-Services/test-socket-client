import "@/app/globals.css"
  import { Toaster } from "@/app/components/ui/sonner"
import { AuthProvider } from "@/app/components/context/userId_and_connection/provider";
import { Inter, Roboto } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
})
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto.variable} antialiased`}>
                <AuthProvider>
        {children}
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
