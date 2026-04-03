"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,  
} from "@/app/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";

import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";


export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const stripSpaces = (value: string) => value.replace(/\s/g, "");


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      setLoading(false);
      return;
    }

    if (!trimmedPassword) {
      setError("Password is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post(`/auth/login`, { email: trimmedEmail, password: trimmedPassword });
      const data = res.data;

    // ✅ Show server response in console
    console.log("Server response:", data);

    // ✅ Set auth_token cookie client-side for middleware
    if (data.user?.access_token) {
      Cookies.set("access_token", data.user.access_token, {
        path: "/", // middleware will read this
        sameSite: process.env.NODE_ENV === "production" ? "Lax" : "Strict",
        secure: process.env.NODE_ENV === "production",
      });

      // ✅ Store access_token in localStorage for API calls
      localStorage.setItem("access_token", data.user.access_token);
      login(data.user.access_token);      
    }

    // ✅ Show success toast
    toast.success(data.message || "Login successful!", { duration: 2000 });

    // ✅ Redirect AFTER cookie is set
    setTimeout(() => {
      router.replace("/"); // middleware will now allow access
    }, 500);

  } catch (err: any) {
    // ✅ Axios error object contains response from server
    if (err.response) {
      console.error("Login error response:", err.response.data);
      toast.error(err.response.data.error || "Login failed. Please try again.");
    } else {
      toast.error(err.message || "Login failed. Please try again.");
    }
  } finally {
    setLoading(false);
  }
}

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {/* <Link
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link> */}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(stripSpaces(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.code === "Space") {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      const cleaned = stripSpaces(pasted);
                      e.preventDefault();
                      setPassword(cleaned);
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--accent-foreground] hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>

                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                    <Link href="/register" replace>
                      Sign up
                    </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
