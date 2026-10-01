"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuthToken, setAuthToken, removeAuthToken, apiRequest } from "./api";

interface User {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "hr" | "employee";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getAuthToken();
    const savedUserStr = localStorage.getItem("nexora_user");
    
    if (savedToken && savedUserStr) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUserStr));
      } catch (e) {
        removeAuthToken();
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    setAuthToken(newToken);
    localStorage.setItem("nexora_user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    removeAuthToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
