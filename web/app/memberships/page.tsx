"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Membership {
  id: number;
  name: string;
  description: string | null;
  price: string;
  billingPeriod: string;
  benefits: any;
  _count: { subscriptions: number };
}

interface PunchPass {
  id: number;
  name: string;
  description: string | null;
  punchCount: number;
  price: string;
  expirationDays: number;
  isTransferable: boolean;
}

export default function MembershipsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberships();
    fetchPunchPasses();
  }, []);

  const fetchMemberships = async () => {
    try {
      const response = await fetch("/api/memberships", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch memberships");
      setMemberships(await response.json());
    } catch (err) {
      console.error("Error fetching memberships:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPunchPasses = async () => {
    try {
      const response = await fetch("/api/punch-passes", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch punch passes");
      setPunchPasses(await response.json());
    } catch (err) {
      console.error("Error fetching punch passes:", err);
    }
  };

  const handleSubscribe = async (membershipId: number) => {
    if (!user) {
      router.push(`/login?returnTo=/memberships`);
      return;
    }

    setSubscribing(membershipId);
    setError(null);
    try {
      const response = await fetch("/api/memberships/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          membershipId,
          successUrl: `${window.location.origin}/membership?success=true`,
          cancelUrl: `${window.location.origin}/memberships`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start subscription");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubscribing(null);
    }
  };

  const handlePurchasePunchPass = async (punchPassId: number) => {
    if (!user) {
      router.push(`/login?returnTo=/memberships`);
      return;
    }

    setPurchasing(punchPassId);
    setError(null);
    try {
      const response = await fetch("/api/punch-passes/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          punchPassId,
          successUrl: `${window.location.origin}/membership?success=true`,
          cancelUrl: `${window.location.origin}/memberships`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to purchase punch pass");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Membership Plans</h1>
        <p className="text-gray-600 mt-2">
          Join our studio and get access to Open Studio time, special resources, and more.
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-center">{error}</div>
        )}

        {/* Memberships Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Monthly Memberships</h2>
          <p className="text-gray-600 mb-6">Recurring access with set benefits each month.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {memberships.map((m) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{m.name}</h3>
                  {m.description && <p className="text-gray-600 mt-2 text-sm">{m.description}</p>}

                  <div className="mt-4">
                    <span className="text-3xl font-bold">${parseFloat(m.price).toFixed(2)}</span>
                    <span className="text-gray-500 text-sm">/{m.billingPeriod.toLowerCase()}</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      Up to {m.benefits?.openStudio?.maxBlockMinutes || 0} min sessions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      {m.benefits?.openStudio?.maxBookingsPerWeek || 0} bookings per week
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      Book {m.benefits?.openStudio?.advanceBookingDays || 0} day(s) in advance
                    </li>
                    {m.benefits?.openStudio?.premiumTimeAccess && (
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">&#10003;</span>
                        Premium time access
                      </li>
                    )}
                    {m.benefits?.openStudio?.walkInAllowed && (
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">&#10003;</span>
                        Walk-in allowed
                      </li>
                    )}
                    {m.benefits?.resources?.specialTools && (
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">&#10003;</span>
                        Special tools access
                      </li>
                    )}
                    {m.benefits?.resources?.specialGlazes && (
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">&#10003;</span>
                        Special glazes access
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      {m.benefits?.firings?.unlimited ? "Unlimited" : `${m.benefits?.firings?.includedPerPeriod || 0}`} kiln firings per period
                    </li>
                    {(m.benefits?.discounts?.classDiscountPercent > 0) && (
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">&#10003;</span>
                        {m.benefits.discounts.classDiscountPercent}% off classes
                      </li>
                    )}
                    {(m.benefits?.discounts?.retailDiscountPercent > 0) && (
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">&#10003;</span>
                        {m.benefits.discounts.retailDiscountPercent}% retail discount
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleSubscribe(m.id)}
                    disabled={subscribing === m.id}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {subscribing === m.id ? "Processing..." : "Subscribe"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {memberships.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No membership plans available yet.
            </div>
          )}
        </section>

        {/* Punch Passes Section */}
        {punchPasses.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Punch Passes</h2>
            <p className="text-gray-600 mb-6">Pay-as-you-go: 1 punch = 1 session. Buy in bulk and use at your own pace.</p>
            <div className="grid md:grid-cols-3 gap-6">
              {punchPasses.map((p) => (
                <div key={p.id} className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="p-6 flex-1 bg-white">
                    <div className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium mb-3">
                      Punch Pass
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                    {p.description && <p className="text-gray-600 mt-2 text-sm">{p.description}</p>}

                    <div className="mt-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-amber-600">{p.punchCount}</span>
                        <span className="text-gray-500">punches</span>
                      </div>
                      <div className="mt-3 flex items-end gap-1">
                        <span className="text-3xl font-bold text-gray-900">${parseFloat(p.price).toFixed(2)}</span>
                        <span className="text-gray-500 text-sm mb-1">
                          ${(parseFloat(p.price) / p.punchCount).toFixed(2)}/punch
                        </span>
                      </div>
                    </div>

                    <ul className="mt-6 space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <span className="text-amber-500">•</span>
                        Expires in {p.expirationDays} days
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-amber-500">•</span>
                        {p.isTransferable ? "Can be shared" : "Personal use only"}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-amber-500">•</span>
                        One punch per session
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      onClick={() => handlePurchasePunchPass(p.id)}
                      disabled={purchasing === p.id}
                      className="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {purchasing === p.id ? "Processing..." : "Buy Now"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
