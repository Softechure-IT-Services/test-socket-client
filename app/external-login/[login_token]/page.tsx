"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import apiFetch from "@/lib/api";

export default function ExternalLoginPage({
  params,
}: {
  params: Promise<{ login_token: string }>;
}) {
  const { login_token } = use(params); // ✅ REQUIRED in Next 16+

  const router = useRouter();

  useEffect(() => {
    // console.log("External login with token:", login_token);
    async function login() {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/external/external-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: login_token }),
        credentials: "include",
      });

      if (res.ok) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
    }

    login();
  }, [login_token, router]);

  return <p>Logging you in…</p>;
}
