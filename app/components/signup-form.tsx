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

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    const newErrors: any = {};
    let valid = true;

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required.";
      valid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Invalid email format.";
      valid = false;
    }

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
      valid = false;
    }

    if (formData.confirmPassword !== formData.password) {
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
      const res = await (await import("@/lib/axios")).default.post(`/auth/register`, {
        external_id: null,
        name: formData.name,
        email: formData.email,
        password: formData.password,
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
    } catch (err) {
      setErrors({ general: "Unable to connect to server." });
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
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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