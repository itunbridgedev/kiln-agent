"use client";

import { useEffect, useState } from "react";

interface ConnectStatus {
  connected: boolean;
  accountId?: string;
  status?: string;
  onboardedAt?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export default function StripeConnectOnboarding() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    fetchStatus();

    // Check for return from Stripe onboarding
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe-success") === "true") {
      // Refresh status after successful onboarding
      setTimeout(fetchStatus, 2000);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/stripe/connect/status", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setStatus(data);
      }
    } catch (err) {
      setError("Failed to fetch Stripe status");
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async () => {
    setOnboarding(true);
    setError(undefined);

    try {
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setOnboarding(false);
      } else if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      }
    } catch (err) {
      setError("Failed to start onboarding");
      setOnboarding(false);
    }
  };

  const refreshOnboarding = async () => {
    setOnboarding(true);
    setError(undefined);

    try {
      const response = await fetch("/api/stripe/connect/refresh", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setOnboarding(false);
      } else if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (err) {
      setError("Failed to refresh onboarding");
      setOnboarding(false);
    }
  };

  const openDashboard = async () => {
    try {
      const response = await fetch("/api/stripe/connect/dashboard", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      setError("Failed to open dashboard");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Payment Processing</h2>
        <p className="mt-2 text-gray-600">
          Connect your Stripe account to accept payments for class registrations
        </p>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {!status?.connected && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Get Started with Stripe
              </h3>
              <p className="text-blue-700 mb-4">
                Stripe Connect allows you to securely accept credit card
                payments from your customers. The setup process takes about 5-10
                minutes.
              </p>
              <ul className="list-disc list-inside text-blue-700 space-y-1 mb-4">
                <li>Accept credit and debit cards</li>
                <li>Automatic payouts to your bank account</li>
                <li>Industry-leading security and fraud protection</li>
                <li>Dashboard to track all your transactions</li>
              </ul>
            </div>

            <button
              onClick={startOnboarding}
              disabled={onboarding}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {onboarding ? "Redirecting to Stripe..." : "Connect with Stripe"}
            </button>
          </div>
        )}

        {status?.connected && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
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
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-green-900">
                    Stripe Connected
                  </h3>
                  <p className="text-green-700 mt-1">
                    Your studio is connected to Stripe
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Account Status</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">
                  {status.status === "complete" ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-yellow-600">Pending</span>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Charges Enabled</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {status.chargesEnabled ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Payouts Enabled</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {status.payoutsEnabled ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Details Submitted</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {status.detailsSubmitted ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-yellow-600">No</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={openDashboard}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Open Stripe Dashboard
              </button>

              {!status.chargesEnabled && (
                <button
                  onClick={refreshOnboarding}
                  disabled={onboarding}
                  className="flex-1 bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 transition"
                >
                  {onboarding ? "Redirecting..." : "Complete Onboarding"}
                </button>
              )}
            </div>

            {!status.chargesEnabled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Action Required:</strong> You need to complete your
                  Stripe onboarding before you can accept payments. Click
                  &quot;Complete Onboarding&quot; to continue the setup process.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
