"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type LinkAction = "link-to-guest" | "create-new";

function LinkOAuthAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<LinkAction | null>(null);

  // Get data from URL params
  const guestEmail = searchParams.get("guestEmail");
  const oauthEmail = searchParams.get("oauthEmail");
  const registrationId = searchParams.get("registrationId");
  const oauthProvider = searchParams.get("provider"); // "apple" or "google"
  const oauthData = searchParams.get("data"); // JSON encoded OAuth user data

  useEffect(() => {
    // If emails match, auto-link silently
    if (guestEmail && oauthEmail && guestEmail.toLowerCase() === oauthEmail.toLowerCase()) {
      handleAutoLink();
    }
  }, [guestEmail, oauthEmail]);

  const handleAutoLink = async () => {
    if (!registrationId || !oauthData) return;

    setLoading(true);
    setError(null);

    try {
      const oauthUser = JSON.parse(decodeURIComponent(oauthData));

      const response = await fetch(
        `${API_BASE_URL}/api/auth/link-oauth-to-guest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            registrationId: parseInt(registrationId),
            provider: oauthProvider,
            oauthData: oauthUser,
            linkExistingEmail: false, // Auto-link uses guest email
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to link account");
      }

      // Success, redirect to my-classes
      setTimeout(() => {
        router.push("/my-classes");
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLinkAction = async (linkAction: LinkAction) => {
    if (!registrationId || !oauthData) return;

    setLoading(true);
    setError(null);

    try {
      const oauthUser = JSON.parse(decodeURIComponent(oauthData));

      const response = await fetch(
        `${API_BASE_URL}/api/auth/link-oauth-to-guest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            registrationId: parseInt(registrationId),
            provider: oauthProvider,
            oauthData: oauthUser,
            linkExistingEmail: linkAction === "link-to-guest",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process account");
      }

      // Success
      setTimeout(() => {
        router.push("/my-classes");
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Emails match - auto-linking
  if (guestEmail === oauthEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
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
                Account Created!
              </h2>
              <p className="text-gray-600 mb-4">
                Your {oauthProvider === "apple" ? "Apple" : "Google"} account has been linked to your guest booking.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to your account...
              </p>
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Emails don't match - offer choice
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Email Mismatch
          </h2>
          <p className="text-gray-600 mb-6">
            Your {oauthProvider === "apple" ? "Apple" : "Google"} account uses a different email than your guest booking.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Guest Booking Email
                </label>
                <p className="text-sm font-medium text-gray-900">{guestEmail}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {oauthProvider === "apple" ? "Apple" : "Google"} Account Email
                </label>
                <p className="text-sm font-medium text-gray-900">{oauthEmail}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            What would you like to do?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleLinkAction("link-to-guest")}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-left"
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="font-semibold">Link to Guest Booking</div>
                  <div className="text-xs text-blue-100 mt-1">
                    Connect to {guestEmail}
                  </div>
                </div>
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
              </div>
            </button>

            <button
              onClick={() => handleLinkAction("create-new")}
              disabled={loading}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="font-semibold">Create New Account</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Use {oauthEmail}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mt-6">
            You can always link additional email addresses to your account later
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LinkOAuthAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <LinkOAuthAccountContent />
    </Suspense>
  );
}
