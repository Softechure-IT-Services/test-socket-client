"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import api from "@/lib/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setMessage("Email is required.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(`/auth/forgot-password`, { email: trimmed });

      setMessage(
        res.data.message || "If that email is registered, a reset link has been sent."
      );

      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch (err: any) {
      if (err.response) {
        setMessage(err.response.data.error || "Unable to send reset link.");
      } else {
        setMessage(err.message || "Unable to send reset link.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center fixed top-0 left-0 w-full h-full z-[99] gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className=" text-primary-foreground flex items-center justify-center rounded-md">
            <img src="/images/logo.png" alt="Softech Chat Logo" width="auto" height={30} />
          </div>
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Reset your password</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                {message && (
                  <FieldDescription className="text-center">
                    {message}
                  </FieldDescription>
                )}

                {resetToken && (
                  <FieldDescription className="text-center">
                    <span className="font-mono break-all">{resetToken}</span>
                  </FieldDescription>
                )}

                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Sending…" : "Send reset link"}
                  </Button>
                </Field>

                <FieldDescription className="text-center">
                  <Link href="/login" replace>
                    Back to login
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
