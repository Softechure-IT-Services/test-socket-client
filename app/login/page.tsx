import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/app/components/login-form"
export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center fixed top-0 left-0 w-full h-full z-[99] gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className=" text-primary-foreground flex items-center justify-center rounded-md">
            <img src="/images/logo.png" alt="Softech Chat Logo" width="auto" height={30} />
          </div>
        </a>
        <LoginForm />
      </div>
    </div>
  )
}

