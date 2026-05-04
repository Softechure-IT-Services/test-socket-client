"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";

export default function ExternalLoginPage({
  params,
}: {
  params: Promise<{ login_token: string }>;
}) {
  const { login_token } = use(params); // ✅ REQUIRED in Next 16+

  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    // console.log("External login with token:", login_token);
    async function runExternalLogin() {
      try {
        const res = await api.post(`/external/external-session`, { token: login_token });
        if (res.status >= 200 && res.status < 300) {
          // The backend sets HttpOnly cookies; reconnect Socket.IO + refresh auth state.
          login();
          router.replace("/");
        } else {
          router.replace("/login");
        }
      } catch (err) {
        router.replace("/login");
      }
    }

    runExternalLogin();
  }, [login, login_token, router]);

  return <p>Logging you in…</p>;
}
