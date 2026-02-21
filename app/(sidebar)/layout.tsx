  import { AppSidebar } from "@/app/components/app-sidebar"
  import AppNavbar from "@/app/components/app-navbar"
  import {
    SidebarInset,
    SidebarProvider
  } from "@/app/components/ui/sidebar"
  import "@/app/globals.css";
  import { RightSidebar as UtilitySidebar } from "@/app/components/utilitysidebar";
  import { Toaster } from "@/app/components/ui/sonner"



  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
<>
    <Toaster />
    {/* LEFT SIDEBAR PROVIDER */}
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
    <AppNavbar />

    <SidebarInset>

      <div className="flex flex-1 flex-col gap-4 p-0 pt-0">
        {children}
      </div>
    </SidebarInset>

      {/* <UtilitySidebar /> */}
    </SidebarProvider>
</>    
    )
  }
