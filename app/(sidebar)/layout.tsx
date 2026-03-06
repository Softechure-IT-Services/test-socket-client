import { AppSidebar } from "@/app/components/app-sidebar"
import AppNavbar from "@/app/components/app-navbar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/app/components/ui/sidebar"
import "@/app/globals.css";
import { Toaster } from "@/app/components/ui/sonner"
import { UnreadProvider } from "@/app/components/context/UnreadContext"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnreadProvider>
      <Toaster />
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <AppNavbar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-0 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UnreadProvider>
  )
}