"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface GuestAccountCreationProps {
  email: string;
  registrationId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type AuthMethod = "password" | "apple" | "google" | null;

interface PasswordStrength {
  score: number; // 0-4
  meets: {
    length: boolean;
    number: boolean;
    uppercase: boolean;
    special: boolean;
  };
}

export default function GuestAccountCreation({
  email,
  registrationId,
  onSuccess,
  onCancel,
}: GuestAccountCreationProps) {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Validate password strength
  const validatePassword = (pwd: string): PasswordStrength => {
    const strength: PasswordStrength = {
      score: 0,
      meets: {
        length: pwd.length >= 8,
        number: /\d/.test(pwd),
        uppercase: /[A-Z]/.test(pwd),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
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

  // Handle password-based account creation
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError("Password must be at least 8 characters with numbers and uppercase letters");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register-guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          registrationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        router.push("/my-classes");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Apple OAuth
  const handleAppleSignIn = () => {
    setLoading(true);
    setError(null);
    // Store registration info for OAuth callback to use
    sessionStorage.setItem("guestRegistrationId", registrationId.toString());
    sessionStorage.setItem("guestEmail", email);
    // Redirect to Apple OAuth flow with return URL
    const returnUrl = `/auth/link-oauth-account?registrationId=${registrationId}&guestEmail=${encodeURIComponent(email)}`;
    window.location.href = `${API_BASE_URL}/api/auth/apple?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  // Handle Google OAuth
  const handleGoogleSignIn = () => {
    setLoading(true);
    setError(null);
    // Store registration info for OAuth callback to use
    sessionStorage.setItem("guestRegistrationId", registrationId.toString());
    sessionStorage.setItem("guestEmail", email);
    // Redirect to Google OAuth flow with return URL
    const returnUrl = `/auth/link-oauth-account?registrationId=${registrationId}&guestEmail=${encodeURIComponent(email)}`;
    window.location.href = `${API_BASE_URL}/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  if (success) {
    return (
      <div className="border-t border-gray-200 pt-6 mt-8">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-green-600 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                Account Created!
              </h3>
              <p className="text-green-700">
                Welcome! You're now logged in. Redirecting to your account...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-8">
      {/* Account Creation Invitation */}
      {authMethod === null && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  Manage Your Reservation
                </h3>
                <p className="text-blue-700 text-sm mb-1">
                  Create a free account to easily manage your booking and see upcoming classes.
                </p>
                <p className="text-blue-600 text-xs font-medium">
                  Email: {email}
                </p>
              </div>
            </div>
          </div>

          {/* Auth Method Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setAuthMethod("password")}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Create with Password
            </button>

            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.14-2.53C2.36 16.83 1 12.6 2.89 9.86c.93-1.38 2.54-2.27 4.19-2.27 1.33 0 2.73.75 3.64.75.93 0 2.38-.93 4.01-.82 1.37.12 2.74.72 3.57 1.8z" />
                <path d="M12 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.49-.57 2.38-1.96 2.52-.35.02-.58-.27-.98-.27-.4 0-.63.29-.98.27-1.39-.14-2.69-1.03-1.96-2.52z" />
              </svg>
              Sign in with Apple
            </button>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full px-4 py-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Password Creation Form */}
      {authMethod === "password" && (
        <div className="w-full max-w-md">
          <div className="flex items-center mb-4">
            <button
              onClick={() => {
                setAuthMethod(null);
                setPassword("");
                setConfirmPassword("");
                setError(null);
              }}
              className="text-blue-600 hover:text-blue-800 mr-2"
            >
              ← Back
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              Create Account
            </h3>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Email Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 flex items-center justify-between">
                  <span>{email}</span>
                  <svg
                    className="w-5 h-5 text-green-600"
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

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a secure password"
                  disabled={loading}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-red-600 text-sm mt-1">
                    Passwords do not match
                  </p>
                )}
                {confirmPassword.length > 0 && passwordsMatch && (
                  <p className="text-green-600 text-sm mt-1">✓ Passwords match</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isPasswordValid || !passwordsMatch || loading}
                className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Alternative Auth Methods */}
              <div className="relative mt-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or sign in with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={loading}
                  className="px-3 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Apple
                </button>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Google
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
