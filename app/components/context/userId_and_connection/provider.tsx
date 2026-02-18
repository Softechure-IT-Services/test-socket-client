
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
  login: (token: string) => void;   // 👈 add this
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  // const socketRef = useRef<Socket | null>(null);
const [socket, setSocket] = useState<Socket | null>(null);
const [token, setToken] = useState<string | null>(null);
useEffect(() => {
  const storedToken = localStorage.getItem("access_token");
  if (storedToken) {
    setToken(storedToken);
  }
}, []);

const login = (newToken: string) => {
  localStorage.setItem("access_token", newToken);
  setToken(newToken);
};

const logout = () => {
  localStorage.removeItem("access_token");
  setToken(null);
  setUser(null);
  socket?.disconnect();
};

  // useEffect(() => {
  //   if (socketRef.current) return; // prevent duplicate connection

  //   // const socket = io(process.env.NEXT_PUBLIC_SERVER_URL!, {
  //   //   withCredentials: true, // ✅ cookies sent
  //   //   transports: ["websocket"],
  //   // });

  //   const socket = io(process.env.NEXT_PUBLIC_SERVER_URL!, {
  //     transports: ["websocket"],
  //     auth: {
  //       token: localStorage.getItem("access_token"), // or from memory
  //     },
  //   });


  //   socketRef.current = socket;

  //   socket.on("connect", () => {
  //     setIsOnline(true);
  //   });

  //   socket.on("auth-success", ({ user }) => {
  //     setUser(user); // ✅ full user object
  //   });

  //   socket.on("disconnect", () => {
  //     setIsOnline(false);
  //     setUser(null);
  //   });

  //   socket.on("connect_error", (err) => {
  //     console.error("Socket error:", err.message);
  //     setIsOnline(false);
  //   });

  //   return () => {
  //     socket.disconnect();
  //     socketRef.current = null;
  //   };
  // }, []);

  useEffect(() => {
    if (!token) return;
  if (socket) return; // prevent duplicate connection
  const s = io(process.env.NEXT_PUBLIC_SERVER_URL!, {
    transports: ["websocket"],
    auth: {
      token: localStorage.getItem("access_token"),
    },
  });

  setSocket(s);

  s.on("connect", () => {
    setIsOnline(true);
  });

  s.on("auth-success", ({ user }) => {
    setUser(user);
  });

  s.on("disconnect", () => {
    setIsOnline(false);
    setUser(null);
  });

  s.on("connect_error", (err) => {
    console.error("Socket error:", err.message);
    setIsOnline(false);
  });

  return () => {
    s.disconnect();
    setSocket(null);
  };
}, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isOnline,
        socket,
        login,
        logout,
        // socket: socketRef.current,
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

