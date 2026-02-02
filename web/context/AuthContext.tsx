"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  picture?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (returnUrl?: string) => void;
  loginWithApple: (returnUrl?: string) => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
    agreedToTerms?: boolean,
    agreedToSms?: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Use relative URL to leverage Next.js rewrites - this makes the request appear
      // to come from www.kilnagent.com instead of api.kilnagent.com
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("[AuthContext] Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (returnUrl?: string) => {
    // Redirect to Google OAuth via Next.js rewrite
    const url = returnUrl
      ? `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
      : "/api/auth/google";
    window.location.href = url;
  };

  const loginWithApple = (returnUrl?: string) => {
    // Redirect to Apple OAuth via Next.js rewrite
    const url = returnUrl
      ? `/api/auth/apple?returnUrl=${encodeURIComponent(returnUrl)}`
      : "/api/auth/apple";
    window.location.href = url;
  };

  const loginWithEmail = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    setUser(data.user);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    agreedToTerms?: boolean,
    agreedToSms?: boolean
  ) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name,
        email,
        password,
        phone,
        agreedToTerms,
        agreedToSms,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    setUser(data.user);
  };

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setUser(null);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithApple,
        loginWithEmail,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
