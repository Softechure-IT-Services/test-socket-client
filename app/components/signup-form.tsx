"use client";

import { useState } from "react";
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
import { suggestUsernameFromName } from "@/lib/username";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatar_url: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const stripSpaces = (value: string) => value.replace(/\s/g, "");
  const generatedUsername = suggestUsernameFromName(formData.name);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirm = formData.confirmPassword.trim();

    if (!trimmedName) {
      newErrors.name = "Full name is required.";
      valid = false;
    }

    if (!generatedUsername) {
      newErrors.username = "Username will be generated from your full name.";
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const trimmedName = formData.name.trim();
      const trimmedEmail = formData.email.trim();
      const trimmedPassword = formData.password.trim();

      await (await import("@/lib/axios")).default.post(`/auth/register`, {
        external_id: null,
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        avatar_url: formData.avatar_url || null,
      });

      toast.success("Account created successfully! Please log in.", {
        duration: 1200,
        onAutoClose: () => {
          setFormData({
            name: "",
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
      if (msg?.toLowerCase().includes("email")) {
        setErrors({ email: msg });
      } else if (msg?.toLowerCase().includes("name")) {
        setErrors({ name: msg });
      } else {
        setErrors({ general: msg ?? "Unable to connect to server." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Already have an account?{" "}
            <Link className="underline" href="/login">
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
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
                {errors.name && (
                  <FieldDescription className="text-red-500">{errors.name}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Username</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm select-none">
                    @
                  </span>
                  <Input
                    type="text"
                    value={generatedUsername}
                    className="pl-7"
                    placeholder="generated_from_name"
                    readOnly
                  />
                </div>
                <FieldDescription>
                  Generated automatically from your full name. The server will add a numeric suffix if needed.
                </FieldDescription>
                {errors.username && (
                  <FieldDescription className="text-red-500">{errors.username}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: stripSpaces(e.target.value),
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === " " || e.code === "Space") {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      e.preventDefault();
                      setFormData((prev) => ({
                        ...prev,
                        password: stripSpaces(pasted),
                      }));
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: stripSpaces(e.target.value),
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === " " || e.code === "Space") {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      e.preventDefault();
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: stripSpaces(pasted),
                      }));
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--accent-foreground] hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <FieldDescription className="text-red-500">{errors.confirmPassword}</FieldDescription>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={loading}>
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
