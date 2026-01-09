
// provider.tsx
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type UserType = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
};

type AuthContextType = {
  user: UserType | null;
  isOnline: boolean;
  socket: Socket | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (socketRef.current) return; // prevent duplicate connection

    const socket = io(process.env.NEXT_PUBLIC_SERVER_URL!, {
      path: "/socket.io",
      withCredentials: true, // ✅ cookies sent
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsOnline(true);
    });

    socket.on("auth-success", ({ user }) => {
      setUser(user); // ✅ full user object
    });

    socket.on("disconnect", () => {
      setIsOnline(false);
      setUser(null);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
      setIsOnline(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isOnline,
        socket: socketRef.current,
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

