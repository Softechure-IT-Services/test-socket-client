import "@/app/globals.css"
import { Toaster } from "@/app/components/ui/sonner"
import { AuthProvider } from "@/app/components/context/userId_and_connection/provider";
import { PresenceProvider } from "@/app/components/context/PresenceContext";
import { TooltipProvider } from "@/app/components/ui/tooltip";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
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
