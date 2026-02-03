"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Registration {
  id: number;
  registrationType: string;
  registrationStatus: string;
  amountPaid: number;
  paymentStatus: string;
  createdAt: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  class: {
    id: number;
    name: string;
    description: string;
    price: number;
    category: {
      name: string;
    };
  };
  sessions: Array<{
    session: {
      id: number;
      sessionDate: string;
      startTime: string;
      endTime: string;
      location: string | null;
      classStep: {
        stepNumber: number;
        name: string;
      } | null;
    };
  }>;
}

export default function RegistrationConfirmationPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const params = useParams();
  const registrationId = params?.id as string;

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioName, setStudioName] = useState<string>("");

  useEffect(() => {
    fetchStudioInfo();
    if (registrationId) {
      fetchRegistration();
    }
  }, [registrationId]);

  const fetchStudioInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/studio`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStudioName(data.name);
      }
    } catch (error) {
      console.error("Error fetching studio info:", error);
    }
  };

  const fetchRegistration = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registrations/${registrationId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch registration");
      }

      const data = await response.json();
      setRegistration(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          user={user}
          studioName={studioName}
          onLogout={handleLogout}
          onNavigateAdmin={() => router.push("/admin")}
          onNavigateLogin={() => router.push("/login")}
        />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          user={user}
          studioName={studioName}
          onLogout={handleLogout}
          onNavigateAdmin={() => router.push("/admin")}
          onNavigateLogin={() => router.push("/login")}
        />
        <div className="flex items-center justify-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-800">{error || "Registration not found"}</p>
            <button
              onClick={() => router.push("/classes")}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Classes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const session = registration.sessions[0]?.session;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        studioName={studioName}
        onLogout={handleLogout}
        onNavigateAdmin={() => router.push("/admin")}
        onNavigateLogin={() => router.push("/login")}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Banner */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <svg
              className="w-12 h-12 text-green-600 mr-4"
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
              <h1 className="text-2xl font-bold text-green-900">
                Booking Confirmed!
              </h1>
              <p className="text-green-700 mt-1">
                Confirmation #{registration.id}
              </p>
            </div>
          </div>
        </div>

        {/* Registration Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Registration Details
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Class Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {registration.class.name}
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                {registration.class.description}
              </p>
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {registration.class.category.name}
              </span>
            </div>

            {/* Guest Contact Info (if guest booking) */}
            {registration.guestEmail && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-900">
                      {registration.guestName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">
                      {registration.guestEmail}
                    </span>
                  </div>
                  {registration.guestPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium text-gray-900">
                        {registration.guestPhone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Details */}
            {session && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Session Details
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">
                      {format(
                        new Date(session.sessionDate),
                        "EEEE, MMMM d, yyyy"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-900">
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                  {session.location && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-gray-900">
                        {session.location}
                      </span>
                    </div>
                  )}
                  {session.classStep && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Course Part:</span>
                      <span className="font-medium text-gray-900">
                        Part {session.classStep.stepNumber}:{" "}
                        {session.classStep.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-3">
                Payment Information
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {formatPrice(registration.amountPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      registration.paymentStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {registration.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration Status:</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      registration.registrationStatus === "CONFIRMED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {registration.registrationStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-3">
                What's Next?
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-600 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    A confirmation email has been sent to your email address
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-600 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Arrive 10-15 minutes early on your session date</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-600 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Contact the studio if you have any questions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push("/my-classes")}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Classes
          </button>
          <button
            onClick={() => router.push("/classes")}
            className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Browse More Classes
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
