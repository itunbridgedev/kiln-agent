"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import BenefitsSummary from "@/components/membership/BenefitsSummary";
import UsageTracker from "@/components/membership/UsageTracker";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface Subscription {
  id: number;
  status: string;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  membership: {
    id: number;
    name: string;
    price: string;
    billingPeriod: string;
    benefits: any;
  };
  usage: {
    bookingsThisWeek: number;
    maxBookingsPerWeek: number;
  };
}


interface PunchPass {
  id: number;
  punchPassId: number;
  name: string;
  description: string | null;
  punchesRemaining: number;
  totalPunches: number;
  purchasedAt: string;
  expiresAt: string;
  expiresIn: number;
  isTransferable: boolean;
}

function MembershipContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUsedPasses, setShowUsedPasses] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnTo=/membership");
      return;
    }
    if (user) {
      fetchSubscription();
      fetchPunchPasses();
    }
  }, [user, authLoading, router]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/memberships/my-subscription", { credentials: "include" });
      if (response.ok) setSubscription(await response.json());
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPunchPasses = async () => {
    try {
      const response = await fetch("/api/punch-passes/my-passes?includeUsed=true", {
        credentials: "include",
      });
      if (response.ok) setPunchPasses(await response.json());
    } catch (err) {
      console.error("Error fetching punch passes:", err);
    }
  };


  const handleCancel = async () => {
    if (!subscription) return;
    if (!confirm("Are you sure you want to cancel your membership? It will remain active until the end of your current billing period.")) return;

    try {
      const response = await fetch("/api/memberships/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      if (response.ok) fetchSubscription();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleManage = async () => {
    if (!subscription) return;
    try {
      const response = await fetch("/api/memberships/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subscriptionId: subscription.id,
          returnUrl: window.location.href,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };


  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  if (!subscription && punchPasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Active Membership</h1>
          <p className="text-gray-600 mb-6">Browse our membership plans and join today.</p>
          <a href="/memberships" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Memberships
          </a>
        </div>
      </div>
    );
  }

  const benefits = subscription?.membership.benefits;
  const visiblePunchPasses = showUsedPasses
    ? punchPasses
    : punchPasses.filter((pass) => pass.punchesRemaining > 0);
  const hasUsedPunchPasses = punchPasses.some((pass) => pass.punchesRemaining === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {subscription ? "My Membership" : "My Punch Passes"}
        </h1>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {showSuccess && (
          <div className="p-4 bg-green-100 text-green-700 rounded-lg">
            {subscription ? "Welcome! Your membership is now active." : "Thank you for your purchase!"}
          </div>
        )}

        {/* Subscription Status */}
        {subscription && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{subscription.membership.name}</h2>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  subscription.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                  subscription.status === "PAST_DUE" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {subscription.status}
                </span>
              </div>
              <p className="text-gray-500 mt-1">
                ${parseFloat(subscription.membership.price).toFixed(2)}/{subscription.membership.billingPeriod.toLowerCase()}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Current period: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
              </p>
              {subscription.cancelledAt && (
                <p className="text-sm text-red-500 mt-1">
                  Cancels at end of period
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManage}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Manage
              </button>
              {!subscription.cancelledAt && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Usage + Benefits */}
        {subscription && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Usage</h3>
            <UsageTracker
              bookingsThisWeek={subscription.usage.bookingsThisWeek}
              maxBookingsPerWeek={subscription.usage.maxBookingsPerWeek}
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Your Benefits</h3>
            <BenefitsSummary benefits={benefits} />
          </div>
        </div>
        )}

        {/* Punch Passes */}
        {punchPasses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Punch Passes</h3>
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    checked={showUsedPasses}
                    onChange={(event) => setShowUsedPasses(event.target.checked)}
                  />
                  Show used passes
                </label>
              </div>
              <a href="/memberships" className="text-amber-600 hover:underline text-sm">
                Buy More &rarr;
              </a>
            </div>

            {visiblePunchPasses.length === 0 ? (
              <p className="text-sm text-gray-500">
                {showUsedPasses
                  ? "No punch passes found."
                  : hasUsedPunchPasses
                    ? "No active punch passes. Check \"Show used passes\" to review previously used passes."
                    : "No active punch passes."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visiblePunchPasses.map((pass) => {
                  const expiresDate = new Date(pass.expiresAt);
                  const isExpiring = expiresDate.getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000;
                  const isUsed = pass.punchesRemaining === 0;

                  return (
                    <div
                      key={pass.id}
                      className={`rounded-lg p-4 border ${
                        isUsed ? "border-gray-200 bg-gray-50" : "border-amber-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{pass.name}</p>
                          <div className={`text-2xl font-bold mt-1 ${isUsed ? "text-gray-400" : "text-amber-600"}`}>
                            {pass.punchesRemaining}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            punches remaining of {pass.totalPunches}
                          </p>
                        </div>
                        {isUsed ? (
                          <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                            Used Up
                          </span>
                        ) : (
                          isExpiring && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                              Expiring Soon
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">Expires: {formatDate(pass.expiresAt)}</p>
                      {pass.isTransferable && (
                        <p className="text-xs text-amber-600 mt-1">Can be shared with others</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Reservations</h3>
            <p className="text-sm text-gray-500 mt-1">View upcoming sessions, check in, and manage bookings.</p>
          </div>
          <a
            href="/my-reservations"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap"
          >
            View My Reservations &rarr;
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function MembershipPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    }>
      <MembershipContent />
    </Suspense>
  );
}
