"use client";

import AuthToggle from "@/components/auth/AuthToggle";
import LoginForm from "@/components/auth/LoginForm";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Login.css";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function LoginPage() {
  const { login, loginWithApple, loginWithEmail, register } = useAuth();
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [studioName, setStudioName] = useState<string>("");
  const [isRootDomain, setIsRootDomain] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    agreedToTerms: false,
    agreedToSms: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchStudioInfo();
  }, []);

  const fetchStudioInfo = async () => {
    try {
      const response = await fetch("/api/studio");
      if (response.ok) {
        const data = await response.json();
        setStudioName(data.name);
        setIsRootDomain(data.isRootDomain || false);

        // Redirect to demo if on root domain
        if (data.isRootDomain) {
          window.location.href =
            process.env.NODE_ENV === "production"
              ? "https://demo.kilnagent.com/login"
              : "http://localhost:3000/login";
        }
      }
    } catch (error) {
      console.error("Error fetching studio info:", error);
    }
  };

  const clearSession = async () => {
    try {
      // Use the Next.js proxy route so cookies are cleared from www.kilnagent.com domain
      window.location.href = "/api/auth/clear-session";
    } catch (err) {
      console.error("Error clearing session:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        if (!formData.agreedToTerms) {
          setError("You must agree to the Terms & Conditions");
          setLoading(false);
          return;
        }
        await register(
          formData.name,
          formData.email,
          formData.password,
          formData.phone,
          formData.agreedToTerms,
          formData.agreedToSms
        );
      } else {
        await loginWithEmail(formData.email, formData.password);
      }
      // Successfully authenticated, check for return URL
      const returnUrl = sessionStorage.getItem("returnUrl");
      if (returnUrl) {
        sessionStorage.removeItem("returnUrl");
        router.push(returnUrl);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      agreedToTerms: false,
      agreedToSms: false,
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-branding">
          <h1>{studioName || "Kiln Agent"}</h1>
          <p className="login-subtitle">powered by Kiln Agent</p>
        </div>
        <p className="login-description">
          {isRegistering
            ? "Create your account"
            : "Sign in to manage your kiln"}
        </p>

        <LoginForm
          isRegistering={isRegistering}
          formData={formData}
          error={error}
          loading={loading}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />

        <SocialLoginButtons
          onGoogleLogin={() => {
            const returnUrl = sessionStorage.getItem("returnUrl");
            login(returnUrl || undefined);
          }}
          onAppleLogin={() => {
            const returnUrl = sessionStorage.getItem("returnUrl");
            loginWithApple(returnUrl || undefined);
          }}
        />

        <AuthToggle
          isRegistering={isRegistering}
          onToggle={handleToggleMode}
          onClearSession={clearSession}
        />
      </div>
    </div>
  );
}
