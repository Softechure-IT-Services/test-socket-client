"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { io, Socket } from "socket.io-client";
const AuthContext = createContext(null);

export const AuthProvider = ({ children}) => {
    const [userId, setUserId] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    
    useEffect(() => {
        const saved = localStorage.getItem("userId");
        if (saved) setUserId(saved);
    }, []);

    //userID save in the in localstorage on change 
     useEffect(() => {
        if (userId) {
        localStorage.setItem("userId", userId);
        } else {
        localStorage.removeItem("userId");
        }
    }, [userId]);

    // check online or offline status 
    useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);


  return (
    <AuthContext.Provider value={{ userId, setUserId, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
