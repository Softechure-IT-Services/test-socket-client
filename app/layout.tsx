import "@/app/globals.css"
import { Toaster } from "@/app/components/ui/sonner"
import { AuthProvider } from "@/app/components/context/userId_and_connection/provider";
import { PresenceProvider } from "@/app/components/context/PresenceContext";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { Inter, Roboto } from "next/font/google";


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
          <PresenceProvider>
            <TooltipProvider delayDuration={0}>
              {children}
            </TooltipProvider>
          </PresenceProvider>
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
