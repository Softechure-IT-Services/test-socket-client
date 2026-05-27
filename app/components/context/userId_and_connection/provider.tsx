"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/axios";
import { clearStoredAuth } from "@/lib/auth-session";

export type UserType = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url?: string;
  status?: string | null;
};

type AuthContextType = {
  user: UserType | null;
  isOnline: boolean;
  socket: Socket | null;
  authReady: boolean;
  hasToken: boolean;
  login: (userData?: UserType | null) => void;
  logout: () => void;
  updateUser: (partial: Partial<UserType>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketKey, setSocketKey] = useState(0);
  const [hasToken, setHasToken] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const login = (userData?: UserType | null) => {
    // Socket.IO auth middleware should read HttpOnly cookies,
    // so we must reconnect after a successful login/refresh.
    socket?.disconnect();
    setSocket(null);
    setSocketKey((prev) => prev + 1);
    if (userData) {
      setUser(userData);
      setHasToken(true);
    }
    setAuthReady(false);
  };

  const updateUser = (partial: Partial<UserType>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...partial };
    });
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore cleanup error
    }
    clearStoredAuth();
    document.cookie = "app_session=; Path=/; Max-Age=0; SameSite=Lax";
    setHasToken(false);
    setUser(null);
    socket?.disconnect();
    setSocket(null);
    setSocketKey((prev) => prev + 1);
    setAuthReady(false);
  };

  useEffect(() => {
    const handleGlobalLogout = () => logout();
    window.addEventListener("auth:logout", handleGlobalLogout);
    return () => {
      window.removeEventListener("auth:logout", handleGlobalLogout);
    };
  }, [socket]);

  useEffect(() => {
    // Always allow unauthenticated sockets (guest). The backend will upgrade
    // to an authenticated socket if the HttpOnly `access_token` cookie exists.
    const s = io(process.env.NEXT_PUBLIC_SERVER_URL!, {
      transports: ["websocket"],
      auth: { guest: true },
      withCredentials: true,
    });

    setSocket(s);

    s.on("connect", () => {
      setIsOnline(true);
      setAuthReady(true);
    });

    s.on("auth-success", ({ user }) => {
      setUser(user);
      setHasToken(true);
      s.emit("refreshUserProfile");
    });

    s.on("disconnect", () => {
      setIsOnline(false);
      setUser(null);
      setHasToken(false);
      setAuthReady(false);
    });

    s.on("userProfileRefreshed", (fresh: Partial<UserType>) => {
      setUser((prev) => (prev ? { ...prev, ...fresh } : prev));
    });

    s.on("connect_error", async (err) => {
      console.error("Socket error:", err.message);
      setIsOnline(false);
      setHasToken(false);
      setAuthReady(true);

      if (err.message === "Unauthorized") {
        try {
          const { refreshAccessToken } = await import("@/lib/auth-session");
          await refreshAccessToken();
          console.log("🔄 Socket token refreshed successfully. Reconnecting socket...");
          setSocketKey((prev) => prev + 1);
        } catch (refreshErr) {
          console.warn("⚠️ Socket refresh failed. Clearing expired cookies to allow guest connection.");
          document.cookie = "access_token=; Path=/; Max-Age=0; SameSite=Lax";
          document.cookie = "refresh_token=; Path=/; Max-Age=0; SameSite=Lax";
          document.cookie = "app_session=; Path=/; Max-Age=0; SameSite=Lax";
          logout();
        }
      }
    });

    return () => {
      s.disconnect();
    };
  }, [socketKey]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isOnline,
        socket,
        authReady,
        hasToken,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
