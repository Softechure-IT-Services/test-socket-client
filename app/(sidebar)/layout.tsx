  import { AuthProvider } from "@/app/components/context/userId_and_connection/provider"
  import { AppSidebar } from "@/app/components/app-sidebar"
  import AppNavbar from "@/app/components/app-navbar"
  import ButtonGroup from "@/app/components/ui/button-group";
  import {
    SidebarInset,
    SidebarProvider
  } from "@/app/components/ui/sidebar"

  import type { Metadata } from "next";
  import { Geist, Geist_Mono } from "next/font/google";
  import "@/app/globals.css";
  import { RightSidebar as UtilitySidebar } from "@/app/components/utilitysidebar";
  import { Toaster } from "@/app/components/ui/sonner"

  const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
  });

  const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
  });

  export const metadata: Metadata = {
    title: "Softech Chat",
    description: "A chat application powered by Softechure",
  };


  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  // export default function Page() {

    return (
       <html lang="en">
  <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <AuthProvider>

   
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

      <UtilitySidebar />
    </SidebarProvider>
       </AuthProvider>
  </body>
</html>

    
    )
  }
// import { Geist, Geist_Mono } from "next/font/google"
// import "@/app/globals.css"

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// })

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// })

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en">
//       <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
//         {children}
//       </body>
//     </html>
//   )
// }
