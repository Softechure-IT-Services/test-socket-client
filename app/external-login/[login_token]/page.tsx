"use client";

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";

export default function ExternalLoginPage({
  params,
}: {
  params: Promise<{ login_token: string }>;
}) {
  const { login_token } = use(params);
  const router = useRouter();
  const { login } = useAuth();
  const processedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!login_token || login_token === processedTokenRef.current) {
      return;
    }

    processedTokenRef.current = login_token;

    async function runExternalLogin(attempt = 0) {
      try {
        const res = await api.post(
          "/external/external-session",
          { token: login_token },
          { withCredentials: true }
        );

        if (res.status >= 200 && res.status < 300 && res.data?.success) {
          document.cookie = "app_session=1; Path=/; Max-Age=86400; SameSite=Lax";
          login(res.data?.user ?? null);
          router.replace("/");
          return;
        }
      } catch (err: unknown) {
        const status = err && typeof err === "object" && "response" in err && err.response ? (err as any).response?.status : null;
        console.error("External login failed:", err);

        if (attempt < 1 && status === 504) {
          // Retry once for transient external service timeouts.
          await new Promise((resolve) => setTimeout(resolve, 400));
          return runExternalLogin(attempt + 1);
        }
      }
      router.replace("/login");
    }

    runExternalLogin();
  }, [login_token, login, router]);

  return <p>Logging you in…</p>;
}