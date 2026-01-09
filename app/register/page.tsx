import { GalleryVerticalEnd } from "lucide-react"

import { SignupForm } from "@/app/components/signup-form"

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-start overflow-auto fixed top-0 left-0 w-full h-full z-[99]  gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className=" text-primary-foreground flex items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
            <img src="/images/logo.png" alt="Softechure logo" height={30} width={'auto'} />
          </div>
        </a>
        <SignupForm  />
      </div>
    </div>
  )
}
