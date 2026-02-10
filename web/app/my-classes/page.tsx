"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Category {
  id: number;
  name: string;
}

interface Class {
  id: number;
  name: string;
  classType: string;
  category: Category;
}

interface ClassSession {
  id: number;
  sessionNumber: number | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
}

interface ClassSchedule {
  id: number;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  sessions: ClassSession[];
}

interface RegistrationSession {
  id: number;
  session: ClassSession;
  attended: boolean;
}

interface Registration {
  id: number;
  registrationType: string;
  registrationStatus: string;
  paymentStatus: string;
  amountPaid: number;
  registeredAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  class: Class;
  schedule: ClassSchedule | null;
  sessions: RegistrationSession[];
}

interface WaitlistEntry {
  id: number;
  position: number;
  joinedAt: string;
  class: Class;
  schedule: ClassSchedule | null;
}

export default function MyClassesPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"registrations" | "waitlist">(
    "registrations"
  );
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioName, setStudioName] = useState<string>("");

  // Redirect to guest bookings page if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/my-bookings");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchStudioInfo();
      fetchReservations();
    }
  }, [user]);

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

  const fetchData = async () => {
    // ...existing code...
  };

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);

    try {
      const [reservationsResponse, waitlistResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reservations/my-reservations`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/registrations/my-waitlist`, {
          credentials: "include",
        }),
      ]);

      if (!reservationsResponse.ok) {
        throw new Error("Failed to fetch reservations");
      }

      if (!waitlistResponse.ok) {
        const errorData = await waitlistResponse.json();
        throw new Error(
          `Failed to fetch waitlist: ${errorData.error || waitlistResponse.statusText}`
        );
      }

      const reservationsData = await reservationsResponse.json();
      const waitlistData = await waitlistResponse.json();

      setRegistrations(reservationsData.registrations);
      setWaitlistEntries(waitlistData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (registrationId: number) => {
    if (!confirm("Are you sure you want to cancel this registration?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registrations/${registrationId}/cancel`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            cancellationReason: "Cancelled by customer",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel registration");
      }

      alert("Registration cancelled successfully");
      fetchData(); // Refresh
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRemoveFromWaitlist = async (waitlistId: number) => {
    if (!confirm("Remove yourself from the waitlist?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registrations/waitlist/${waitlistId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove from waitlist");
      }

      alert("Removed from waitlist");
      fetchData(); // Refresh
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-green-100 text-green-800",
      WAITLISTED: "bg-orange-100 text-orange-800",
      CANCELLED: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`text-xs font-medium px-2 py-1 rounded ${styles[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      COMPLETED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      REFUNDED: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`text-xs font-medium px-2 py-1 rounded ${styles[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status}
      </span>
    );
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Show loading state while checking authentication
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        studioName={studioName}
        onLogout={handleLogout}
        onNavigateAdmin={() => router.push("/admin")}
        onNavigateLogin={() => router.push("/login")}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
          <p className="mt-2 text-gray-600">
            View your registrations and waitlist entries
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("registrations")}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === "registrations"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Registrations ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab("waitlist")}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === "waitlist"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Waitlist ({waitlistEntries.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : (
          <>
            {/* Registrations Tab */}
            {activeTab === "registrations" && (
              <div className="space-y-4">
                {registrations.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <p className="text-gray-500 mb-4">
                      You haven't registered for any classes yet
                    </p>
                    <Link
                      href="/classes"
                      className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                    >
                      Browse Classes
                    </Link>
                  </div>
                ) : (
                  registrations.map((registration) => (
                    <div
                      key={registration.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Link
                              href={`/registrations/${registration.id}`}
                              className="text-xl font-bold text-gray-900 hover:text-blue-600"
                            >
                              {registration.class.name}
                            </Link>
                            {getStatusBadge(registration.registrationStatus)}
                            {getPaymentStatusBadge(registration.paymentStatus)}
                          </div>
                          <p className="text-sm text-gray-500">
                            {registration.class.category.name} •{" "}
                            {registration.registrationType.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatPrice(registration.amountPaid)}
                          </div>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      {registration.schedule && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">
                                Start Date:
                              </span>
                              <p className="text-gray-600">
                                {format(
                                  new Date(registration.schedule.startDate),
                                  "MMM d, yyyy"
                                )}
                              </p>
                            </div>
                            {registration.schedule.endDate && (
                              <div>
                                <span className="font-medium text-gray-700">
                                  End Date:
                                </span>
                                <p className="text-gray-600">
                                  {format(
                                    new Date(registration.schedule.endDate),
                                    "MMM d, yyyy"
                                  )}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">
                                Time:
                              </span>
                              <p className="text-gray-600">
                                {registration.schedule.startTime} -{" "}
                                {registration.schedule.endTime}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Sessions:
                              </span>
                              <p className="text-gray-600">
                                {registration.schedule.sessions.length} sessions
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Registered Sessions */}
                      {registration.sessions &&
                      Array.isArray(registration.upcomingReservations) && registration.upcomingReservations.length > 0 ? (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Your Sessions ({registration.upcomingReservations.length}):
                          </h4>
                          <div className="space-y-1">
                            {registration.upcomingReservations.slice(0, 3).map((reservation: any) => (
                              <div key={reservation.id} className="text-sm text-gray-700">
                                <span className="font-medium">
                                  {format(new Date(reservation.session.date), "EEE, MMM d, yyyy")}
                                </span>
                                {" at "}
                                {reservation.session.startTime}
                                {reservation.status === "CHECKED_IN" && (
                                  <span className="ml-2 text-blue-600">✓ Checked In</span>
                                )}
                              </div>
                            ))}
                            {registration.upcomingReservations.length > 3 && (
                              <p className="text-sm text-gray-500 italic">
                                ...and {registration.upcomingReservations.length - 3} more session(s)
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Session information not available for this registration.
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-500">
                          Registered{" "}
                          {format(
                            new Date(registration.registeredAt),
                            "MMM d, yyyy"
                          )}
                        </span>
                        <div className="flex-1"></div>
                        {/* Show Manage Reservations button for multi-step classes or non-single-session registrations */}
                        {(registration.registrationType !== "SINGLE_SESSION" || registration.class.classType === "multi-step") &&
                          registration.registrationStatus !== "CANCELLED" && (
                            <Link
                              href={`/registrations/${registration.id}/reservations`}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              Manage Reservations
                            </Link>
                          )}
                        {registration.registrationStatus === "PENDING" && (
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                            Complete Payment
                          </button>
                        )}
                        {registration.registrationStatus !== "CANCELLED" && (
                          <button
                            onClick={() =>
                              handleCancelRegistration(registration.id)
                            }
                            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                          >
                            Cancel Registration
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Waitlist Tab */}
            {activeTab === "waitlist" && (
              <div className="space-y-4">
                {waitlistEntries.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">You're not on any waitlists</p>
                  </div>
                ) : (
                  waitlistEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link
                              href={`/classes/${entry.class.id}`}
                              className="text-xl font-bold text-gray-900 hover:text-blue-600"
                            >
                              {entry.class.name}
                            </Link>
                            <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              POSITION #{entry.position}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            {entry.class.category.name}
                          </p>

                          {entry.schedule && (
                            <div className="text-sm text-gray-600">
                              <p>
                                Starts:{" "}
                                {format(
                                  new Date(entry.schedule.startDate),
                                  "MMM d, yyyy"
                                )}
                              </p>
                              <p>
                                Time: {entry.schedule.startTime} -{" "}
                                {entry.schedule.endTime}
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveFromWaitlist(entry.id)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Leave Waitlist
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                        Joined {format(new Date(entry.joinedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
