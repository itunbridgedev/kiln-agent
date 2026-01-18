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
  login: () => void;
  loginWithApple: () => void;
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
      console.log("[AuthContext] === CHECKING AUTHENTICATION ===");
      console.log(
        "[AuthContext] Requesting:",
        window.location.origin + "/api/auth/me"
      );
      console.log(
        "[AuthContext] Document cookie:",
        document.cookie ? document.cookie.substring(0, 50) + "..." : "NONE"
      );

      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      console.log("[AuthContext] Response status:", response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log("[AuthContext] ✓ Authentication SUCCESS");
        console.log("[AuthContext] User data:", userData);
        console.log("[AuthContext] === AUTHENTICATION COMPLETE ===");
        setUser(userData);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log("[AuthContext] ✗ Authentication FAILED");
        console.log("[AuthContext] Error:", errorData);
        console.log("[AuthContext] === REDIRECTING TO LOGIN ===");
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

  const login = () => {
    // Redirect to Google OAuth via Next.js rewrite
    window.location.href = "/api/auth/google";
  };

  const loginWithApple = () => {
    // Redirect to Apple OAuth via Next.js rewrite
    window.location.href = "/api/auth/apple";
  };

  const loginWithEmail = async (email: string, password: string) => {
    console.log("[AuthContext] === LOGIN ATTEMPT ===");
    console.log("[AuthContext] Current location:", window.location.href);
    console.log(
      "[AuthContext] Request URL:",
      window.location.origin + "/api/auth/login"
    );
    console.log("[AuthContext] Sending login request to /api/auth/login");
    console.log(
      "[AuthContext] Credentials before login:",
      document.cookie || "NONE"
    );

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    console.log("[AuthContext] Login response status:", response.status);
    console.log("[AuthContext] Login response headers:");
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    // Check for Set-Cookie header specifically
    const setCookie = response.headers.get("set-cookie");
    console.log("[AuthContext] Set-Cookie header:", setCookie || "NOT PRESENT");

    const data = await response.json();
    console.log("[AuthContext] Login response data:", data);

    if (!response.ok) {
      console.log("[AuthContext] ✗ LOGIN FAILED:", data.error);
      throw new Error(data.error || "Login failed");
    }

    console.log("[AuthContext] ✓ LOGIN SUCCESS");

    // Wait a moment for cookies to be set
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(
      "[AuthContext] Credentials after login (immediate):",
      document.cookie || "STILL NONE!"
    );

    // Check again after a delay
    setTimeout(() => {
      console.log(
        "[AuthContext] Credentials after login (delayed 500ms):",
        document.cookie || "STILL NONE AFTER DELAY!"
      );
    }, 500);

    console.log("[AuthContext] Setting user in state:", data.user);
    setUser(data.user);
    console.log("[AuthContext] === LOGIN COMPLETE ===");
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
