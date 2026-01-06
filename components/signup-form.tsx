"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

  const BACKEND_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

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
      const response = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          external_id: null,           // optional
          name: formData.name,
          email: formData.email,
          password: formData.password, // 👈 send password to backend
          avatar_url: formData.avatar_url || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // setErrors({ general: data.error || "Registration failed." });
        toast.error(data.error || "Registration failed.");
      } else {
       toast.success("Account created successfully! Please log in.", {
  duration: 1200, // 1.2 seconds
  onAutoClose: () => {
    // Reset form AFTER toast closes
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      avatar_url: "",
    });

    // Redirect AFTER reset
    router.push("/login");
  },
});

      }
    } catch (err) {
      setErrors({ general: "Unable to connect to server." });
    }

    setLoading(false);
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                {errors.name && (
                  <FieldDescription className="text-red-500">
                    {errors.name}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                {errors.email && (
                  <FieldDescription className="text-red-500">
                    {errors.email}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Avatar URL (optional)</FieldLabel>
                <Input
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  value={formData.avatar_url}
                  onChange={(e) =>
                    setFormData({ ...formData, avatar_url: e.target.value })
                  }
                />
              </Field>

              <Field>
                <FieldLabel>Password</FieldLabel>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                {errors.password && (
                  <FieldDescription className="text-red-500">
                    {errors.password}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Confirm Password</FieldLabel>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                />
                {errors.confirmPassword && (
                  <FieldDescription className="text-red-500">
                    {errors.confirmPassword}
                  </FieldDescription>
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
