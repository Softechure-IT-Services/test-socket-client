"use client";

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import api from "@/lib/axios";

export type UserType = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url?: string;
};

type AuthContextType = {
  user: UserType | null;
  isOnline: boolean;
  socket: Socket | null;
  login: (token: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<UserType>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const clearStoredAuth = () => {
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; Max-Age=0; path=/";
    document.cookie = "refresh_token=; Max-Age=0; path=/";
    document.cookie = "user_id=; Max-Age=0; path=/";
    document.cookie = "username=; Max-Age=0; path=/";
  };

  const getTokenExpiryMs = (value: string) => {
    try {
      const [, payload] = value.split(".");
      if (!payload) return null;

      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const decoded = JSON.parse(atob(padded));

      return typeof decoded?.exp === "number" ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  };

  const isTokenFresh = (value: string, minTtlMs = 60_000) => {
    const expiryMs = getTokenExpiryMs(value);
    if (!expiryMs) return true;
    return expiryMs - Date.now() > minTtlMs;
  };

  const refreshAccessToken = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const refreshedToken = response.data?.accessToken ?? null;

      if (!refreshedToken) {
        clearStoredAuth();
        setToken(null);
        setUser(null);
        return null;
      }

      localStorage.setItem("access_token", refreshedToken);
      setToken(refreshedToken);
      return refreshedToken;
    } catch {
      clearStoredAuth();
      setToken(null);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem("access_token");

      if (!storedToken) {
        if (!cancelled) {
          setToken(null);
          setAuthReady(true);
        }
        return;
      }

      if (isTokenFresh(storedToken)) {
        if (!cancelled) {
          setToken(storedToken);
          setAuthReady(true);
        }
        return;
      }

      const refreshedToken = await refreshAccessToken();
      if (!cancelled) {
        setToken(refreshedToken);
        setAuthReady(true);
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem("access_token", newToken);
    setToken(newToken);
    setAuthReady(true);
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
    setToken(null);
    setUser(null);
    socket?.disconnect();
    setSocket(null);
    setAuthReady(true);
  };

  useEffect(() => {
    const handleGlobalLogout = () => logout();
    window.addEventListener("auth:logout", handleGlobalLogout);
    return () => {
      window.removeEventListener("auth:logout", handleGlobalLogout);
    };
  }, [socket]);

  useEffect(() => {
    if (!authReady) return;
    if (!token) return;
    if (socket) return; 

    const s = io(process.env.NEXT_PUBLIC_SERVER_URL!, {
      transports: ["websocket"],
      auth: (cb) => {
        cb({ token: localStorage.getItem("access_token") });
      },
    });

    setSocket(s);

    s.on("connect", () => {
      setIsOnline(true);
    });

    s.on("auth-success", ({ user }) => {
      setUser(user);
      s.emit("refreshUserProfile");
    });

    s.on("disconnect", () => {
      setIsOnline(false);
      setUser(null);
    });

    s.on("userProfileRefreshed", (fresh: Partial<UserType>) => {
      setUser((prev) => prev ? { ...prev, ...fresh } : prev);
    });

    s.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
      setIsOnline(false);
      // Removed the immediate logout() tripwire here!
      // The Axios interceptor now exclusively handles authoritative logouts via 'auth:logout' events when refresh completely fails.
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [authReady, token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isOnline,
        socket,
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
