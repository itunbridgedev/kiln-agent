"use client";

import GuestAccountCreation from "@/components/auth/GuestAccountCreation";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/dates";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type CalendarView = "month" | "week" | "day" | "list";

const formatDateTime = (dateStr: string, timeStr: string) => {
  try {
    const date = parseISO(dateStr);
    return format(date, "EEEE, MMMM d, yyyy") + ` at ${formatTime(timeStr)}`;
  } catch {
    return `${dateStr} at ${formatTime(timeStr)}`;
  }
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

interface Registration {
  id: number;
  passType: string;
  sessionsIncluded: number | null;
  sessionsRemaining: number | null;
  sessionsAttended: number;
  currentReservations: number;
  maxReservations: number;
  canReserveMore: boolean;
  validFrom: string | null;
  validUntil: string | null;
  class: {
    id: number;
    name: string;
    classType: string;
  };
}

interface AvailableSession {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  topic: string | null;
  className: string;
  currentReservations: number;
  availableSpots: number;
  isAvailable: boolean;
  isReserved: boolean;
}

interface Reservation {
  id: number;
  source?: "flexible" | "initial";
  status: string;
  reservedAt: string;
  checkedInAt: string | null;
  attendedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  noShowDetectedAt: string | null;
  punchUsed: boolean;
  customerNotes: string | null;
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

export default function ReservationsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const params = useParams();
  const registrationId = params?.id as string;

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [registrationBasic, setRegistrationBasic] = useState<any | null>(null);
  const [availableSessions, setAvailableSessions] = useState<
    AvailableSession[]
  >([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioName, setStudioName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"available" | "my-reservations">(
    "available"
  );
  const [reserving, setReserving] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchStudioInfo();
    if (registrationId && user) {
      fetchData();
    }
    // Fetch basic registration info for guests (to allow account creation)
    if (registrationId) {
      (async () => {
        try {
          const resp = await fetch(`${API_BASE_URL}/api/registrations/${registrationId}`, { credentials: 'include' });
          if (resp.ok) {
            const data = await resp.json();
            setRegistrationBasic({ guestEmail: data.guestEmail, className: data.class?.name });
          }
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [registrationId, user]);

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
    setLoading(true);
    setError(null);

    try {
      const [calendarRes, availableRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/registrations/${registrationId}/calendar`, {
          credentials: "include",
        }),
        fetch(
          `${API_BASE_URL}/api/reservations/available?registrationId=${registrationId}`,
          {
            credentials: "include",
          }
        ),
      ]);

      if (!calendarRes.ok) {
        throw new Error("Failed to fetch registration calendar");
      }

      if (!availableRes.ok) {
        throw new Error("Failed to fetch available sessions");
      }

      const calendarData = await calendarRes.json();
      const availableData = await availableRes.json();

      setRegistration(calendarData.registration);
      setMyReservations(calendarData.reservations);
      
      // Mark sessions as reserved if they're in myReservations (excluding cancelled)
      const reservedSessionIds = new Set(
        calendarData.reservations
          .filter((r: Reservation) => r.status !== 'CANCELLED')
          .map((r: Reservation) => r.session.id)
      );
      
      const sessionsWithReservedStatus = availableData.sessions.map((session: AvailableSession) => ({
        ...session,
        isReserved: reservedSessionIds.has(session.id)
      }));
      
      setAvailableSessions(sessionsWithReservedStatus);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (sessionId: number) => {
    if (!registration) return;

    setReserving(sessionId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          registrationId: registration.id,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create reservation");
      }

      await fetchData(); // Refresh data
      setActiveTab("my-reservations");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setReserving(null);
    }
  };

  const handleCancel = async (reservationId: number, source?: "flexible" | "initial") => {
    if (!confirm("Are you sure you want to cancel this reservation?")) {
      return;
    }

    setCancelling(reservationId);
    try {
      const url = source === "initial"
        ? `${API_BASE_URL}/api/reservations/initial/${reservationId}`
        : `${API_BASE_URL}/api/reservations/${reservationId}`;

      const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            reason: "Cancelled by customer",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel reservation");
      }

      await fetchData(); // Refresh data
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCancelling(null);
    }
  };

  const handleCheckIn = async (reservationId: number) => {
    setCheckingIn(reservationId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reservations/${reservationId}/check-in`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check in");
      }

      await fetchData(); // Refresh data
      alert("Successfully checked in!");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCheckingIn(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };



  const canCheckIn = (checkInWindow?: {
    start: string;
    end: string;
    canCheckIn: boolean;
  }) => {
    if (!checkInWindow) return false;
    return checkInWindow.canCheckIn;
  };

  // Calendar helper functions
  const getCalendarDays = () => {
    let start, end;
    
    if (calendarView === "month") {
      start = startOfWeek(startOfMonth(currentDate));
      end = endOfWeek(endOfMonth(currentDate));
    } else if (calendarView === "week") {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else {
      start = startOfDay(currentDate);
      end = startOfDay(currentDate);
    }
    
    return eachDayOfInterval({ start, end });
  };

  const getSessionsForDay = (day: Date) => {
    return availableSessions.filter(session => {
      const sessionDate = parseLocalDate(session.date);
      return isSameDay(sessionDate, day);
    });
  };

  const navigateCalendar = (direction: "prev" | "next") => {
    if (calendarView === "month") {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (calendarView === "week") {
      setCurrentDate(direction === "next" ? new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000) : new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(direction === "next" ? new Date(currentDate.getTime() + 24 * 60 * 60 * 1000) : new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    }
  };

  const handleShowMore = (day: Date) => {
    setCurrentDate(day);
    setCalendarView("week");
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 22; hour++) {
      slots.push(`${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`);
    }
    return slots;
  };

  const getSessionPosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 7 * 60; // 7:00 AM baseline
    return ((totalMinutes - startMinutes) / 60) * 48; // 48px per hour (matches h-12)
  };

  const getSessionHeight = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    return (durationMinutes / 60) * 48; // 48px per hour (matches h-12)
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          user={null}
          studioName={studioName}
          onLogout={handleLogout}
          onNavigateAdmin={() => router.push("/admin")}
          onNavigateLogin={() => router.push("/login")}
        />
        <div className="flex items-center justify-center py-12 px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md w-full">
            <p className="text-yellow-800 mb-4">Please log in to manage reservations</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Log In
              </button>
              {registrationBasic?.guestEmail && (
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-2">Or create an account for {registrationBasic.guestEmail} to manage this reservation.</p>
                  <GuestAccountCreation
                    email={registrationBasic.guestEmail}
                    registrationId={parseInt(registrationId)}
                    onSuccess={() => router.push(`/registrations/${registrationId}/reservations`)}
                    onCancel={() => { /* noop */ }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              onClick={() => router.push("/my-classes")}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to My Classes
            </button>
          </div>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/my-classes")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Back to My Classes
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manage Reservations
          </h1>
          <p className="text-lg text-gray-600">{registration.class.name}</p>
        </div>

        {/* Pass Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Pass Type</p>
              <p className="text-lg font-semibold text-gray-900">
                {registration.passType.replace(/_/g, " ")}
              </p>
            </div>
            {registration.sessionsIncluded && (
              <div>
                <p className="text-sm text-gray-600">Sessions Included</p>
                <p className="text-lg font-semibold text-gray-900">
                  {registration.sessionsIncluded}
                </p>
              </div>
            )}
            {registration.sessionsRemaining !== null && (
              <div>
                <p className="text-sm text-gray-600">Sessions Remaining</p>
                <p className="text-lg font-semibold text-gray-900">
                  {registration.sessionsRemaining}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Current Reservations</p>
              <p className="text-lg font-semibold text-gray-900">
                {registration.currentReservations} /{" "}
                {registration.maxReservations}
              </p>
            </div>
          </div>

          {!registration.canReserveMore && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                You've reached your maximum advance reservations (
                {registration.maxReservations}). Cancel or attend existing
                reservations to book more.
              </p>
            </div>
          )}

          {registration.sessionsRemaining === 0 && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                No sessions remaining on your pass. All sessions have been used.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("available")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "available"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Available Sessions (
              {
                availableSessions.filter((s) => s.isAvailable && !s.isReserved)
                  .length
              }
              )
            </button>
            <button
              onClick={() => setActiveTab("my-reservations")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "my-reservations"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Reservations (
              {myReservations.filter((r) => r.status !== "CANCELLED").length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "available" && (
          <div className="space-y-4">
            {/* View Selector and Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCalendarView("month")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      calendarView === "month"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCalendarView("week")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      calendarView === "week"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView("day")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      calendarView === "day"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setCalendarView("list")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      calendarView === "list"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    List
                  </button>
                </div>

                {calendarView !== "list" && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigateCalendar("prev")}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      ←
                    </button>
                    <span className="font-semibold text-gray-900">
                      {calendarView === "month" && format(currentDate, "MMMM yyyy")}
                      {calendarView === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
                      {calendarView === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
                    </span>
                    <button
                      onClick={() => navigateCalendar("next")}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      →
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm"
                    >
                      Today
                    </button>
                  </div>
                )}
              </div>

              {/* Calendar Grid */}
              {calendarView === "month" && (
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {getCalendarDays().map((day, idx) => {
                    const sessions = getSessionsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    
                    return (
                      <div
                        key={idx}
                        className={`min-h-24 border rounded-lg p-2 ${
                          isToday ? "border-blue-500 bg-blue-50" : "border-gray-200"
                        } ${!isCurrentMonth ? "opacity-40" : ""}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-700" : "text-gray-700"}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-1">
                          {sessions.slice(0, 3).map(session => (
                            <div
                              key={session.id}
                              className={`text-xs p-1 rounded cursor-pointer ${
                                session.isReserved
                                  ? "bg-green-100 text-green-800"
                                  : session.isAvailable
                                    ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                              onClick={() => {
                                if (session.isAvailable && !session.isReserved && registration.canReserveMore && registration.sessionsRemaining !== 0) {
                                  handleReserve(session.id);
                                }
                              }}
                            >
                              {formatTime(session.startTime)}
                              {session.isReserved && " ✓"}
                            </div>
                          ))}
                          {sessions.length > 3 && (
                            <button
                              onClick={() => handleShowMore(day)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              +{sessions.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Week View - Time Grid */}
              {calendarView === "week" && (
                <div className="flex border rounded-lg overflow-hidden">
                  {/* Time column */}
                  <div className="w-20 border-r">
                    <div className="h-12 border-b"></div>
                    {getTimeSlots().map((time, idx) => (
                      <div key={idx} className="h-12 border-b relative">
                        <span className="absolute bottom-0 right-2 text-xs text-gray-600 bg-white pb-0.5">{time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Days columns */}
                  {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map((day) => {
                    const sessions = getSessionsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div key={day.toString()} className="flex-1 border-r last:border-r-0">
                        {/* Day header */}
                        <div className={`h-12 border-b text-center py-1 ${isToday ? "bg-blue-100" : "bg-gray-50"}`}>
                          <div className="text-xs text-gray-600">{format(day, "EEE")}</div>
                          <div className={`text-sm font-semibold ${isToday ? "text-blue-700" : "text-gray-900"}`}>
                            {format(day, "d")}
                          </div>
                        </div>

                        {/* Time grid with sessions */}
                        <div className="relative">
                          {getTimeSlots().map((_, idx) => (
                            <div key={idx} className="h-12 border-b"></div>
                          ))}

                          {/* Sessions positioned absolutely */}
                          {sessions.map(session => (
                            <div
                              key={session.id}
                              className={`absolute left-0 right-0 mx-1 rounded px-2 py-1 text-xs cursor-pointer overflow-hidden ${
                                session.isReserved
                                  ? "bg-green-200 text-green-900 border-l-4 border-green-600"
                                  : session.isAvailable
                                    ? "bg-blue-200 text-blue-900 border-l-4 border-blue-600 hover:bg-blue-300"
                                    : "bg-gray-200 text-gray-600 border-l-4 border-gray-400"
                              }`}
                              style={{
                                top: `${getSessionPosition(session.startTime) + 48}px`,
                                height: `${getSessionHeight(session.startTime, session.endTime)}px`,
                                minHeight: '24px'
                              }}
                              onClick={() => {
                                if (session.isAvailable && !session.isReserved && registration.canReserveMore && registration.sessionsRemaining !== 0) {
                                  handleReserve(session.id);
                                }
                              }}
                            >
                              <div className="font-semibold">{formatTime(session.startTime)} - {formatTime(session.endTime)}</div>
                              <div className="truncate">{session.className}</div>
                              {session.isReserved && <div className="text-green-700">✓ Reserved</div>}
                              {!session.isAvailable && !session.isReserved && <div className="text-gray-600">Full</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Day View - Single Column Time Grid */}
              {calendarView === "day" && (
                <div className="flex border rounded-lg overflow-hidden max-w-2xl">
                  {/* Time column */}
                  <div className="w-24 border-r">
                    <div className="h-12 border-b bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs text-gray-600">{format(currentDate, "EEE")}</div>
                        <div className="text-lg font-semibold text-gray-900">{format(currentDate, "d")}</div>
                      </div>
                    </div>
                    {getTimeSlots().map((time, idx) => (
                      <div key={idx} className="h-12 border-b relative">
                        <span className="absolute bottom-0 right-3 text-sm text-gray-600 bg-white pb-0.5">{time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Day column */}
                  <div className="flex-1 relative">
                    <div className="h-12 border-b bg-blue-50 flex items-center justify-center font-semibold text-gray-900">
                      {format(currentDate, "MMMM d, yyyy")}
                    </div>

                    {/* Time grid */}
                    <div className="relative">
                      {getTimeSlots().map((_, idx) => (
                        <div key={idx} className="h-12 border-b"></div>
                      ))}

                      {/* Sessions */}
                      {getSessionsForDay(currentDate).map(session => (
                        <div
                          key={session.id}
                          className={`absolute left-0 right-0 mx-2 rounded px-3 py-2 text-sm cursor-pointer ${
                            session.isReserved
                              ? "bg-green-200 text-green-900 border-l-4 border-green-600"
                              : session.isAvailable
                                ? "bg-blue-200 text-blue-900 border-l-4 border-blue-600 hover:bg-blue-300"
                                : "bg-gray-200 text-gray-600 border-l-4 border-gray-400"
                          }`}
                          style={{
                            top: `${getSessionPosition(session.startTime) + 48}px`,
                            height: `${getSessionHeight(session.startTime, session.endTime)}px`,
                            minHeight: '40px'
                          }}
                          onClick={() => {
                            if (session.isAvailable && !session.isReserved && registration.canReserveMore && registration.sessionsRemaining !== 0) {
                              handleReserve(session.id);
                            }
                          }}
                        >
                          <div className="font-bold">{formatTime(session.startTime)} - {formatTime(session.endTime)}</div>
                          <div className="font-medium">{session.className}</div>
                          {session.topic && <div className="text-xs mt-1">{session.topic}</div>}
                          <div className="text-xs mt-1">
                            {session.currentReservations}/{session.currentReservations + session.availableSpots} spots
                          </div>
                          {session.isReserved && <div className="text-green-700 font-semibold mt-1">✓ Reserved</div>}
                          {!session.isAvailable && !session.isReserved && <div className="text-gray-600 font-semibold mt-1">Full</div>}
                        </div>
                      ))}

                      {getSessionsForDay(currentDate).length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          No sessions scheduled
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* List View */}
            {calendarView === "list" && (
              <div className="space-y-4">
                {availableSessions.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">
                      No available sessions to reserve at this time.
                    </p>
                  </div>
                ) : (
                  availableSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`bg-white rounded-lg shadow-sm border p-6 ${
                        session.isReserved
                          ? "border-green-200 bg-green-50"
                          : !session.isAvailable
                            ? "border-gray-200 opacity-60"
                            : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {format(parseLocalDate(session.date), 'EEEE, MMMM d, yyyy')} at {formatTime(session.startTime)} - {formatTime(session.endTime)}
                          </h3>
                          {session.topic && (
                            <p className="text-gray-600 mb-2">{session.topic}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>
                              {session.currentReservations} /{" "}
                              {session.currentReservations + session.availableSpots}{" "}
                              spots filled
                            </span>
                            {session.availableSpots > 0 && (
                              <span className="text-green-600 font-medium">
                                {session.availableSpots} spots available
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          {session.isReserved ? (
                            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                              Already Reserved
                            </div>
                          ) : !session.isAvailable ? (
                            <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
                              Full
                            </div>
                          ) : !registration.canReserveMore ? (
                            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                              Max Reservations
                            </div>
                          ) : registration.sessionsRemaining === 0 ? (
                            <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm">
                              No Sessions Left
                            </div>
                          ) : (
                            <button
                              onClick={() => handleReserve(session.id)}
                              disabled={reserving === session.id}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {reserving === session.id
                                ? "Reserving..."
                                : "Reserve"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "my-reservations" && (
          <div className="space-y-4">
            {myReservations.filter((r) => r.status !== "CANCELLED").length ===
            0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500 mb-4">
                  You haven't made any reservations yet.
                </p>
                <button
                  onClick={() => setActiveTab("available")}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Browse Available Sessions →
                </button>
              </div>
            ) : (
              myReservations
                .filter((r) => r.status !== "CANCELLED")
                .map((reservation) => (
                  <div
                    key={reservation.id}
                    className={`bg-white rounded-lg shadow-sm border p-6 ${
                      reservation.status === "ATTENDED"
                        ? "border-green-200 bg-green-50"
                        : reservation.status === "CHECKED_IN"
                          ? "border-blue-200 bg-blue-50"
                          : reservation.status === "NO_SHOW"
                            ? "border-red-200 bg-red-50"
                            : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatDateTime(
                              reservation.session.date,
                              reservation.session.startTime
                            )}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              reservation.status === "ATTENDED"
                                ? "bg-green-100 text-green-800"
                                : reservation.status === "CHECKED_IN"
                                  ? "bg-blue-100 text-blue-800"
                                  : reservation.status === "NO_SHOW"
                                    ? "bg-red-100 text-red-800"
                                    : reservation.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {reservation.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        {reservation.session.topic && (
                          <p className="text-gray-600 mb-2">
                            {reservation.session.topic}
                          </p>
                        )}

                        <div className="text-sm text-gray-500 space-y-1">
                          <p>
                            Reserved:{" "}
                            {format(
                              parseISO(reservation.reservedAt),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </p>
                          {reservation.checkedInAt && (
                            <p>
                              Checked In:{" "}
                              {format(
                                parseISO(reservation.checkedInAt),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </p>
                          )}
                          {reservation.attendedAt && (
                            <p>
                              Attended:{" "}
                              {format(
                                parseISO(reservation.attendedAt),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </p>
                          )}
                          {reservation.punchUsed && (
                            <p className="text-orange-600 font-medium">
                              ✓ Punch used
                            </p>
                          )}
                        </div>

                        {reservation.status === "PENDING" &&
                          reservation.checkInWindow && (
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800">
                                {canCheckIn(reservation.checkInWindow)
                                  ? "✓ Check-in window is open"
                                  : `Check-in opens: ${format(parseISO(reservation.checkInWindow.start), "MMM d 'at' h:mm a")}`}
                              </p>
                            </div>
                          )}
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        {reservation.status === "PENDING" &&
                          canCheckIn(reservation.checkInWindow) && (
                            <button
                              onClick={() => handleCheckIn(reservation.id)}
                              disabled={checkingIn === reservation.id}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                            >
                              {checkingIn === reservation.id
                                ? "Checking In..."
                                : "Check In"}
                            </button>
                          )}

                        {reservation.status === "PENDING" && (
                          <button
                            onClick={() => handleCancel(reservation.id, reservation.source)}
                            disabled={cancelling === reservation.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                          >
                            {cancelling === reservation.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
