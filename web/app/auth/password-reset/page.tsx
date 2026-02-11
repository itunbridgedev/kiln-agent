"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function PasswordResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");

  const [step, setStep] = useState<"request" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resetToken) {
      setStep("reset");
    }
  }, [resetToken]);

  // Password strength validation
  const validatePassword = (pwd: string) => {
    const strength = {
      score: 0,
      meets: {
        length: pwd.length >= 8,
        number: /\d/.test(pwd),
        uppercase: /[A-Z]/.test(pwd),
      },
    };
    strength.score = Object.values(strength.meets).filter(Boolean).length;
    return strength;
  };

  const passwordStrength = validatePassword(password);
  const isPasswordValid =
    password.length >= 8 &&
    passwordStrength.meets.number &&
    passwordStrength.meets.uppercase;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  // Handle password reset request
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/request-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request password reset");
      }

      setMessage("Check your email for password reset instructions");
      setEmail("");
      setTimeout(() => setStep("success"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset with token
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError(
        "Password must be at least 8 characters with numbers and uppercase letters"
      );
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            token: resetToken,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setStep("success");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Password Reset
          </h1>
          <p className="text-gray-600">
            {step === "request"
              ? "Enter your email to receive reset instructions"
              : step === "reset"
              ? "Set your new password"
              : "Success!"}
          </p>
        </div>

        {/* Request Password Reset */}
        {step === "request" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-700 text-sm">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!email || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Sending..." : "Send Reset Email"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => router.push("/login")}
                className="w-full text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* Reset Password with Token */}
        {step === "reset" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a secure password"
                  disabled={loading}
                  required
                />

                {/* Password Requirements */}
                {password.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center text-sm">
                      <svg
                        className={`w-4 h-4 mr-2 ${
                          passwordStrength.meets.length
                            ? "text-green-600"
                            : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span
                        className={
                          passwordStrength.meets.length
                            ? "text-gray-600"
                            : "text-gray-400"
                        }
                      >
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <svg
                        className={`w-4 h-4 mr-2 ${
                          passwordStrength.meets.number
                            ? "text-green-600"
                            : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span
                        className={
                          passwordStrength.meets.number
                            ? "text-gray-600"
                            : "text-gray-400"
                        }
                      >
                        Contains a number
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <svg
                        className={`w-4 h-4 mr-2 ${
                          passwordStrength.meets.uppercase
                            ? "text-green-600"
                            : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span
                        className={
                          passwordStrength.meets.uppercase
                            ? "text-gray-600"
                            : "text-gray-400"
                        }
                      >
                        Contains uppercase letter
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                  disabled={loading}
                  required
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-red-600 text-sm mt-1">
                    Passwords do not match
                  </p>
                )}
                {confirmPassword.length > 0 && passwordsMatch && (
                  <p className="text-green-600 text-sm mt-1">
                    ✓ Passwords match
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!isPasswordValid || !passwordsMatch || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        )}

        {/* Success State */}
        {step === "success" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {resetToken ? "Password Reset!" : "Email Sent!"}
              </h2>
              <p className="text-gray-600 mb-6">
                {resetToken
                  ? "Your password has been successfully reset. You're being redirected to login..."
                  : "Check your email for password reset instructions. The link will expire in 1 hour."}
              </p>
              {!resetToken && (
                <button
                  onClick={() => setStep("request")}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Send another email
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <PasswordResetContent />
    </Suspense>
  );
}
