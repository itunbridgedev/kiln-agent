"use client";

import { useAuth } from "@/context/AuthContext";
import "@/styles/Login.css";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function CompleteRegistrationPage() {
  const { checkAuth } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    phone: "",
    agreedToTerms: false,
    agreedToSms: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    if (!formData.agreedToTerms) {
      setError("You must agree to the Terms & Conditions");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone: formData.phone,
          agreedToTerms: formData.agreedToTerms,
          agreedToSms: formData.agreedToSms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete registration");
      }

      // Refresh auth state and navigate to home
      await checkAuth();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to complete registration");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Complete Your Registration</h1>
        <p>Just a couple more details to get you started</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreedToTerms"
                checked={formData.agreedToTerms}
                onChange={handleInputChange}
                required
              />
              &nbsp;
              <span>
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </a>
              </span>
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreedToSms"
                checked={formData.agreedToSms}
                onChange={handleInputChange}
              />
              &nbsp;
              <span>I agree to receive SMS text messages from Kiln Agent</span>
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Please wait..." : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
