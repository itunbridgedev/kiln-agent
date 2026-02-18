"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ClassRegistration {
  id: number;
  className: string;
  passType: string;
  currentReservations: number;
  maxReservations: number;
  sessionsRemaining: number | null;
  upcomingReservations: Reservation[];
}

interface Reservation {
  id: number;
  status: string;
  reservedAt: string;
  session: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    topic: string | null;
    className: string;
  };
  checkInWindow?: {
    start: string;
    end: string;
    canCheckIn: boolean;
  };
}

interface OpenStudioBooking {
  id: number;
  className: string;
  resourceName: string;
  status: string;
  reservedAt: string;
  session: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    className: string;
  };
  bookingStartTime: string;
  bookingEndTime: string;
  checkInWindow?: {
    start: string;
    end: string;
    canCheckIn: boolean;
  };
}

interface OpenStudioWaitlistEntry {
  id: number;
  className: string;
  resourceName: string;
  position: number;
  reservedAt: string;
  session: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    className: string;
  };
  waitlistStartTime: string;
  waitlistEndTime: string;
}

export default function MyReservationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [openStudioBookings, setOpenStudioBookings] = useState<OpenStudioBooking[]>([]);
  const [openStudioWaitlist, setOpenStudioWaitlist] = useState<OpenStudioWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user]);

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/my-reservations`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }

      const data = await response.json();
      setRegistrations(data.registrations);
      setOpenStudioBookings(data.openStudioBookings || []);
      setOpenStudioWaitlist(data.openStudioWaitlist || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEEE, MMMM d, yyyy") + ` at ${formatTime(timeStr)}`;
    } catch {
      return `${dateStr} at ${formatTime(timeStr)}`;
    }
  };

  const handleCheckIn = async (bookingId: string | number, type: 'class' | 'openStudio' = 'class') => {
    setCheckingIn(`${type}-${bookingId}`);
    try {
      let endpoint = `/api/reservations/${bookingId}/check-in`;
      if (type === 'openStudio') {
        endpoint = `/api/open-studio/bookings/${bookingId}/check-in`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check in");
      }

      await fetchReservations(); // Refresh data
      alert("Successfully checked in!");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCheckingIn(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <p className="text-yellow-800">Please log in to view your reservations</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalUpcomingReservations = registrations.reduce(
    (sum, reg) => sum + reg.upcomingReservations.length,
    0
  ) + openStudioBookings.length + openStudioWaitlist.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reservations</h1>
          <p className="text-lg text-gray-600">
            {totalUpcomingReservations} upcoming {totalUpcomingReservations === 1 ? "reservation" : "reservations"} across {registrations.length} {registrations.length === 1 ? "class" : "classes"}
          </p>
        </div>

        {totalUpcomingReservations === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">You don't have any upcoming reservations.</p>
            <button
              onClick={() => router.push("/")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Browse Classes →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Open Studio Bookings Section */}
            {openStudioBookings.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Open Studio Bookings</h2>
                <div className="space-y-3">
                  {openStudioBookings.map((booking) => (
                    <div key={booking.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {formatDateTime(booking.session.date, booking.bookingStartTime)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.resourceName} • {booking.session.className}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {booking.status === "RESERVED" &&
                            booking.checkInWindow?.canCheckIn && (
                              <button
                                onClick={() => handleCheckIn(booking.id, 'openStudio')}
                                disabled={checkingIn === `openStudio-${booking.id}`}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                {checkingIn === `openStudio-${booking.id}`
                                  ? "Checking In..."
                                  : "Check In"}
                              </button>
                            )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === "RESERVED"
                                ? "bg-yellow-100 text-yellow-800"
                                : booking.status === "CHECKED_IN"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {booking.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      {booking.status === "RESERVED" &&
                        booking.checkInWindow && (
                          <div className="mt-2 text-xs text-gray-600">
                            {booking.checkInWindow.canCheckIn
                              ? "✓ Check-in window is open"
                              : `Check-in opens: ${format(parseISO(booking.checkInWindow.start), "MMM d 'at' h:mm a")}`}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Studio Waitlist Section */}
            {openStudioWaitlist.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Open Studio Waitlist</h2>
                <div className="space-y-3">
                  {openStudioWaitlist.map((entry) => (
                    <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {formatDateTime(entry.session.date, entry.waitlistStartTime)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {entry.resourceName} • {entry.session.className}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Waitlist #{entry.position}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Class Reservations Section */}
            {registrations.map((registration) => (
              <div
                key={registration.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                {/* Class Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {registration.className}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{registration.passType.replace(/_/g, " ")}</span>
                      <span>•</span>
                      <span>
                        {registration.currentReservations} / {registration.maxReservations} advance reservations
                      </span>
                      {registration.sessionsRemaining !== null && (
                        <>
                          <span>•</span>
                          <span>{registration.sessionsRemaining} sessions remaining</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/registrations/${registration.id}/reservations`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Manage
                  </button>
                </div>

                {/* Upcoming Reservations */}
                {registration.upcomingReservations.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-sm">No upcoming reservations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">
                      Upcoming Sessions ({registration.upcomingReservations.length}):
                    </p>
                    {registration.upcomingReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="bg-gray-50 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {formatDateTime(reservation.session.date, reservation.session.startTime)}
                            </p>
                            {reservation.session.topic && (
                              <p className="text-sm text-gray-600">{reservation.session.topic}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {reservation.status === "PENDING" &&
                              reservation.checkInWindow?.canCheckIn && (
                                <button
                                onClick={() => handleCheckIn(reservation.id, 'class')}
                                disabled={checkingIn === `class-${reservation.id}`}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                {checkingIn === `class-${reservation.id}`
                                    ? "Checking In..."
                                    : "Check In"}
                                </button>
                              )}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                reservation.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : reservation.status === "CHECKED_IN"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {reservation.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        {reservation.status === "PENDING" &&
                          reservation.checkInWindow && (
                            <div className="mt-2 text-xs text-gray-600">
                              {reservation.checkInWindow.canCheckIn
                                ? "✓ Check-in window is open"
                                : `Check-in opens: ${format(parseISO(reservation.checkInWindow.start), "MMM d 'at' h:mm a")}`}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
