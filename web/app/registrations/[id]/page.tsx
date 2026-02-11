"use client";

import GuestAccountCreation from "@/components/auth/GuestAccountCreation";
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
  refundAmount?: number | null;
  refundedAt?: string | null;
  class: {
    id: number;
    name: string;
    description: string;
    price: number;
    classType: string;
    requiresSequence: boolean;
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
  const [showAccountCreation, setShowAccountCreation] = useState(false);

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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
        <div
          className={`border-2 rounded-lg p-6 mb-8 ${
            registration.paymentStatus === "REFUNDED"
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div className="flex items-center">
            <svg
              className={`w-12 h-12 mr-4 ${
                registration.paymentStatus === "REFUNDED"
                  ? "text-red-600"
                  : "text-green-600"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {registration.paymentStatus === "REFUNDED" ? (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              )}
            </svg>
            <div>
              <h1
                className={`text-2xl font-bold ${
                  registration.paymentStatus === "REFUNDED"
                    ? "text-red-900"
                    : "text-green-900"
                }`}
              >
                {registration.paymentStatus === "REFUNDED"
                  ? "Booking Refunded"
                  : "Booking Confirmed!"}
              </h1>
              <p
                className={`mt-1 ${
                  registration.paymentStatus === "REFUNDED"
                    ? "text-red-700"
                    : "text-green-700"
                }`}
              >
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

            {/* Account Creation Section for Guest Bookings */}
            {registration.guestEmail && !user && (
              <div className="border-t border-gray-200 pt-6">
                {!showAccountCreation ? (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-blue-900 mb-1">
                          🎉 Create Your Account
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          Create a free account to manage your reservation and see upcoming classes.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAccountCreation(true)}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap ml-4"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                ) : (
                  <GuestAccountCreation
                    email={registration.guestEmail}
                    registrationId={parseInt(registrationId)}
                    onSuccess={() => {
                      setShowAccountCreation(false);
                    }}
                    onCancel={() => setShowAccountCreation(false)}
                  />
                )}
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
                      {formatTime(session.startTime)} - {formatTime(session.endTime)}
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
                {registration.refundedAt && registration.refundAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Refund Amount:</span>
                    <span className="font-bold text-red-600 text-lg">
                      -{formatPrice(registration.refundAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span
                    className={`px-2 py-1 text-xs rounded font-medium ${
                      registration.paymentStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : registration.paymentStatus === "REFUNDED"
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {registration.paymentStatus}
                  </span>
                </div>
                {registration.refundedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Refunded On:</span>
                    <span className="text-gray-900">
                      {format(new Date(registration.refundedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration Status:</span>
                  <span
                    className={`px-2 py-1 text-xs rounded font-medium ${
                      registration.registrationStatus === "CONFIRMED"
                        ? "bg-green-100 text-green-800"
                        : registration.registrationStatus === "CANCELLED"
                        ? "bg-red-100 text-red-800"
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
              
              {/* Show reservation prompt for multi-step classes */}
              {registration.class.classType === "multi-step" && registration.class.requiresSequence && session?.classStep && (
                <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg
                      className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-1">
                        📅 Book Your Remaining Sessions
                      </p>
                      <p className="text-sm text-blue-800 mb-3">
                        You've successfully reserved Part {session.classStep.stepNumber}! This is a multi-step course, so after completing this session, you'll need to reserve the next parts in sequence to continue your learning journey.
                      </p>
                      <button
                        onClick={() => router.push(`/registrations/${registration.id}/reservations`)}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center shadow-sm"
                      >
                        View & Reserve Next Sessions
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show reservation prompt for other non-single-session registrations */}
              {registration.registrationType !== "SINGLE_SESSION" && registration.class.classType !== "multi-step" && registration.sessions.length === 0 && (
                <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg
                      className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-1">
                        Reserve Your Sessions Now!
                      </p>
                      <p className="text-sm text-blue-800 mb-3">
                        This is a multi-session class. You need to reserve individual sessions to attend.
                      </p>
                      <button
                        onClick={() => router.push(`/registrations/${registration.id}/reservations`)}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                      >
                        Reserve Sessions
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
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
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          {registration.registrationType !== "SINGLE_SESSION" && (
            <div className="flex-1">
              {!user && registration.guestEmail ? (
                <div>
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg opacity-60 cursor-not-allowed"
                  >
                    Manage Session Reservations
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Create an account to manage your reservations.</p>
                    <button
                      onClick={() => setShowAccountCreation(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/registrations/${registration.id}/reservations`)}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Manage Session Reservations
                </button>
              )}
            </div>
          )}
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
