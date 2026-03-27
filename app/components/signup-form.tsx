"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";

/** Derive a username suggestion from a display name */
function suggestUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);
}

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatar_url: "",
  });

  const stripSpaces = (value: string) => value.replace(/\s/g, "");

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);

  // Auto-suggest username from name (only if user hasn't manually edited it)
  const usernameManualRef = useRef(false);
  useEffect(() => {
    if (!usernameManualRef.current && formData.name) {
      const suggestion = suggestUsername(formData.name);
      setFormData((prev) => ({ ...prev, username: suggestion }));
    }
  }, [formData.name]);

  // Debounced username availability check
  useEffect(() => {
    const username = formData.username;
    if (!username || !usernameTouched) {
      setUsernameStatus("idle");
      return;
    }

    // Basic format check first
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const axiosInstance = (await import("@/lib/axios")).default;
        const res = await axiosInstance.get(`/users/check-username?username=${encodeURIComponent(username)}`);
        setUsernameStatus(res.data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData.username, usernameTouched]);

  const validate = () => {
    const newErrors: any = {};
    let valid = true;

    const trimmedName = formData.name.trim();
    const trimmedUsername = formData.username.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirm = formData.confirmPassword.trim();

    if (!trimmedName) {
      newErrors.name = "Full name is required.";
      valid = false;
    }

    if (!trimmedUsername) {
      newErrors.username = "Username is required.";
      valid = false;
    } else if (!/^[a-z0-9_-]{3,30}$/.test(trimmedUsername)) {
      newErrors.username = "3–30 chars: letters, numbers, _ or - only.";
      valid = false;
    } else if (usernameStatus === "taken") {
      newErrors.username = "Username already taken.";
      valid = false;
    } else if (usernameStatus === "checking") {
      newErrors.username = "Still checking availability…";
      valid = false;
    }

    if (!trimmedEmail) {
      newErrors.email = "Email is required.";
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      newErrors.email = "Invalid email format.";
      valid = false;
    }

    if (!trimmedPassword || trimmedPassword.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
      valid = false;
    }

    if (trimmedConfirm !== trimmedPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const trimmedName = formData.name.trim();
      const trimmedEmail = formData.email.trim();
      const trimmedPassword = formData.password.trim();
      const trimmedUsername = formData.username.trim();

      const res = await (await import("@/lib/axios")).default.post(`/auth/register`, {
        external_id: null,
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword,
        avatar_url: formData.avatar_url || null,
      });

      toast.success("Account created successfully! Please log in.", {
        duration: 1200,
        onAutoClose: () => {
          setFormData({
            name: "",
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            avatar_url: "",
          });
          router.push("/login");
        },
      });
    } catch (err: any) {
      const errorData = err?.response?.data;
      const msg = errorData?.error || errorData?.message;
      if (msg?.toLowerCase().includes("username")) {
        setErrors({ username: msg });
      } else if (msg?.toLowerCase().includes("email")) {
        setErrors({ email: msg });
      } else {
        setErrors({ general: msg ?? "Unable to connect to server." });
      }
    } finally {
      setLoading(false);
    }
  };

  // Username status indicator
  const UsernameIndicator = () => {
    if (!usernameTouched || !formData.username) return null;
    if (usernameStatus === "checking") return <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />;
    if (usernameStatus === "available") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (usernameStatus === "taken") return <XCircle className="w-4 h-4 text-red-500" />;
    if (usernameStatus === "invalid") return <XCircle className="w-4 h-4 text-amber-500" />;
    return null;
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Already have an account?{" "}
            <Link className="underline" href={"/login"}>
              Sign in
            </Link>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Full Name</FieldLabel>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && (
                  <FieldDescription className="text-red-500">{errors.name}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Username</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm select-none">@</span>
                  <Input
                    type="text"
                    value={formData.username}
                    className="pl-7 pr-9"
                    onChange={(e) => {
                      usernameManualRef.current = true;
                      setUsernameTouched(true);
                      const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
                      setFormData({ ...formData, username: cleaned });
                    }}
                    onFocus={() => setUsernameTouched(true)}
                    placeholder="your_handle"
                    autoComplete="username"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <UsernameIndicator />
                  </span>
                </div>
                {usernameStatus === "available" && usernameTouched && !errors.username && (
                  <FieldDescription className="text-emerald-500">@{formData.username} is available!</FieldDescription>
                )}
                {usernameStatus === "taken" && usernameTouched && (
                  <FieldDescription className="text-red-500">@{formData.username} is already taken.</FieldDescription>
                )}
                {usernameStatus === "invalid" && usernameTouched && (
                  <FieldDescription className="text-amber-500">3–30 chars: letters, numbers, _ or - only.</FieldDescription>
                )}
                {errors.username && usernameStatus !== "taken" && usernameStatus !== "invalid" && (
                  <FieldDescription className="text-red-500">{errors.username}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                {errors.email && (
                  <FieldDescription className="text-red-500">{errors.email}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Password</FieldLabel>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: stripSpaces(e.target.value) })}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.code === "Space") {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      const cleaned = stripSpaces(pasted);
                      e.preventDefault();
                      setFormData({ ...formData, password: cleaned });
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--accent-foreground] hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <FieldDescription className="text-red-500">{errors.password}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Confirm Password</FieldLabel>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: stripSpaces(e.target.value) })}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.code === "Space") {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      const cleaned = stripSpaces(pasted);
                      e.preventDefault();
                      setFormData({ ...formData, confirmPassword: cleaned });
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--accent-foreground] hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <FieldDescription className="text-red-500">{errors.confirmPassword}</FieldDescription>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={loading || usernameStatus === "checking" || usernameStatus === "taken"}>
                  {loading ? "Creating..." : "Create Account"}
                </Button>
                {errors.general && (
                  <FieldDescription className="text-red-500 text-center">
                    {errors.general}
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}