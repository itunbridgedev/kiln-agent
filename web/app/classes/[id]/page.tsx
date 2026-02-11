"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import StripeCheckout from "@/components/StripeCheckout";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/dates";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type CalendarView = "month" | "week" | "day" | "list";

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

interface Category {
  id: number;
  name: string;
}

interface TeachingRole {
  id: number;
  name: string;
}

interface ClassStep {
  id: number;
  stepNumber: number;
  name: string;
  description: string;
  durationHours: number;
}

interface ClassSession {
  id: number;
  sessionNumber: number | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  maxStudents: number | null;
  currentEnrollment: number;
  availableSpots: number;
  location: string | null;
  topic: string | null;
  isCancelled: boolean;
  status: string;
  classStepId: number | null;
  classStep: ClassStep | null;
}

interface ResourceRequirement {
  id: number;
  resourceId: number;
  quantityPerStudent: number;
  resource: {
    id: number;
    name: string;
    quantityAvailable: number;
  };
}

interface Class {
  id: number;
  name: string;
  description: string;
  classType: string;
  durationWeeks: number | null;
  durationHours: number | null;
  maxStudents: number;
  price: number;
  skillLevel: string | null;
  imageUrl: string | null;
  isRecurring: boolean;
  requiresSequence: boolean;
  category: Category;
  teachingRole: TeachingRole | null;
  steps: ClassStep[];
  sessions: ClassSession[];
  resourceRequirements: ResourceRequirement[];
}

export default function ClassDetailPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const params = useParams();
  const classId = params?.id as string;

  const [classDetails, setClassDetails] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioName, setStudioName] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [registering, setRegistering] = useState(false);
  const [resourceAvailability, setResourceAvailability] = useState<
    Record<number, number>
  >({});
  const [bookingAsGuest, setBookingAsGuest] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchStudioInfo();
    if (classId) {
      fetchClassDetails();
    }
  }, [classId]);

  // Auto-open booking modal when returning from login
  useEffect(() => {
    if (user && classDetails) {
      const urlParams = new URLSearchParams(window.location.search);
      const autoBook = urlParams.get("autoBook");
      const sessionId = urlParams.get("sessionId");

      if (autoBook === "true" && sessionId) {
        const sessionIdNum = parseInt(sessionId, 10);
        // Find the session to ensure it exists
        const session = classDetails.sessions.find(
          (s) => s.id === sessionIdNum
        );
        if (session) {
          handleRegister(sessionIdNum);
          // Clean up URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
      }
    }
  }, [user, classDetails]);

  const fetchStudioInfo = async () => {
    try {
      const response = await fetch("/api/studio", {
        headers: {
          "X-Original-Host": window.location.hostname,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStudioName(data.name);
      }
    } catch (error) {
      console.error("Error fetching studio info:", error);
    }
  };

  const fetchClassDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registrations/classes/${classId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch class details");
      }

      const data = await response.json();
      setClassDetails(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setGuestCount(1);

    // Check resource availability for this session
    if (classDetails?.resourceRequirements.length) {
      await checkResourceAvailability(sessionId);
    }

    setShowRegistrationModal(true);
  };

  const checkResourceAvailability = async (sessionId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registrations/resource-availability?sessionId=${sessionId}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        const availability: Record<number, number> = {};
        data.forEach((item: any) => {
          availability[item.resourceId] = item.available;
        });
        setResourceAvailability(availability);
      }
    } catch (err) {
      console.error("Error checking resource availability:", err);
    }
  };

  const handleSubmitRegistration = async () => {
    if (!selectedSession) {
      alert("Please select a session");
      return;
    }

    // Validate authentication or guest info
    if (!user && !bookingAsGuest) {
      alert("Please log in or continue as guest");
      return;
    }

    if (bookingAsGuest && (!guestInfo.name || !guestInfo.email)) {
      alert("Please provide your name and email");
      return;
    }

    // Validate resource availability
    if (classDetails?.resourceRequirements.length) {
      for (const req of classDetails.resourceRequirements) {
        const needed = guestCount * req.quantityPerStudent;
        const available = resourceAvailability[req.resourceId] || 0;

        if (needed > available) {
          alert(
            `Not enough ${req.resource.name} available. Need ${needed}, only ${available} available.`
          );
          return;
        }
      }
    }

    setRegistering(true);

    try {
      // Determine registration type based on class type
      let registrationType = "SINGLE_SESSION";
      if (classDetails?.classType === "multi-session" || classDetails?.classType === "series") {
        // For multi-session classes, use FULL_SCHEDULE to register for all sessions
        // DROP_IN type allows registering for individual sessions within a series
        registrationType = "FULL_SCHEDULE";
      }

      // Step 1: Create payment intent
      const response = await fetch(
        `${API_BASE_URL}/api/stripe/payment/create-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            classId: classDetails!.id,
            sessionId: selectedSessionId,
            registrationType,
            guestCount,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment intent");
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setShowPayment(true);
    } catch (err: any) {
      console.error("Payment intent error:", err);
      alert(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setRegistering(true);

    try {
      // Determine registration type based on class type
      let registrationType = "SINGLE_SESSION";
      if (classDetails?.classType === "multi-session" || classDetails?.classType === "series") {
        registrationType = "FULL_SCHEDULE";
      }

      // Step 2: Confirm payment and create registration
      const requestBody: any = {
        paymentIntentId,
        classId: classDetails!.id,
        sessionId: selectedSessionId,
        registrationType,
        guestCount,
      };

      // Add guest info if booking as guest
      if (bookingAsGuest) {
        requestBody.guestName = guestInfo.name;
        requestBody.guestEmail = guestInfo.email;
        requestBody.guestPhone = guestInfo.phone;
      }

      console.log("=== CONFIRMING PAYMENT ===");
      console.log("Request URL:", `${API_BASE_URL}/api/stripe/payment/confirm`);
      console.log("Request Body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        `${API_BASE_URL}/api/stripe/payment/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("=== PAYMENT CONFIRMATION FAILED ===");
        console.error("Response text:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        console.error("Error data:", errorData);
        throw new Error(errorData.error || "Failed to confirm registration");
      }

      const data = await response.json();
      console.log("=== PAYMENT CONFIRMED SUCCESSFULLY ===");
      console.log("Response data:", data);
      const registrationId = data.registrationId;

      // Store guest booking ID in localStorage for later retrieval
      if (bookingAsGuest) {
        const guestBookings = JSON.parse(
          localStorage.getItem("guestBookings") || "[]"
        );
        guestBookings.push({
          id: registrationId,
          email: guestInfo.email,
          className: classDetails!.name,
          date: new Date().toISOString(),
        });
        localStorage.setItem("guestBookings", JSON.stringify(guestBookings));
      }

      // Success! Redirect to confirmation page
      router.push(`/registrations/${registrationId}`);
    } catch (err: any) {
      console.error("Registration error:", err);
      alert(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error);
    alert(`Payment failed: ${error}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const selectedSession = classDetails?.sessions.find(
    (s) => s.id === selectedSessionId
  );

  const handleLogout = async () => {
    await logout();
    router.push("/login");
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
    if (!classDetails) return [];
    return classDetails.sessions.filter(session => {
      const sessionDate = parseLocalDate(session.sessionDate);
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

  if (error || !classDetails) {
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
            <p className="text-red-800">{error || "Class not found"}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        studioName={studioName}
        onLogout={handleLogout}
        onNavigateAdmin={() => router.push("/admin")}
        onNavigateLogin={() => router.push("/login")}
      />

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/classes")}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            <span className="mr-1">←</span> Back to Classes
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image */}
            <div className="h-96 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              {classDetails.imageUrl ? (
                <img
                  src={classDetails.imageUrl}
                  alt={classDetails.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-white text-9xl">🏺</span>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded">
                  {classDetails.category.name}
                </span>
                {classDetails.skillLevel && (
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                    {classDetails.skillLevel}
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {classDetails.name}
              </h1>

              <p className="text-gray-600 mb-6 text-lg">
                {classDetails.description}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <span className="font-semibold text-gray-900 w-32">
                    Duration:
                  </span>
                  <span className="text-gray-600">
                    {classDetails.classType === "single-session"
                      ? `${classDetails.durationHours} hours`
                      : `${classDetails.durationWeeks} weeks`}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="font-semibold text-gray-900 w-32">
                    Class Size:
                  </span>
                  <span className="text-gray-600">
                    Up to {classDetails.maxStudents} students
                  </span>
                </div>
                {classDetails.teachingRole && (
                  <div className="flex items-start">
                    <span className="font-semibold text-gray-900 w-32">
                      Instructor:
                    </span>
                    <span className="text-gray-600">
                      {classDetails.teachingRole.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatPrice(classDetails.price)}
                </div>
                <p className="text-gray-600 text-sm">
                  {classDetails.classType === "single-session"
                    ? "Per session"
                    : "Full course"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Step Classes */}
      {classDetails.steps.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Course Structure
          </h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {classDetails.steps.map((step) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {step.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-1">
                      {step.description}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {step.durationHours} hours
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Sessions */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Available Sessions
        </h2>

        {classDetails.sessions.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              No upcoming sessions available. Check back later or contact us for
              more information.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* View Tabs and Navigation */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                {/* View Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCalendarView("month")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      calendarView === "month"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCalendarView("week")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      calendarView === "week"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView("day")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      calendarView === "day"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setCalendarView("list")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      calendarView === "list"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    List
                  </button>
                </div>

                {/* Navigation Controls */}
                {calendarView !== "list" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigateCalendar("prev")}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      ←
                    </button>
                    <div className="font-semibold text-gray-900 min-w-[200px] text-center">
                      {calendarView === "month" && format(currentDate, "MMMM yyyy")}
                      {calendarView === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
                      {calendarView === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
                    </div>
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

              {/* Calendar Grid - Month View */}
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
                          {sessions.slice(0, 3).map(session => {
                            const isFull = session.availableSpots <= 0;
                            return (
                              <div
                                key={session.id}
                                className={`text-xs p-1 rounded cursor-pointer ${
                                  isFull
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                }`}
                                onClick={() => !isFull && handleRegister(session.id)}
                              >
                                {formatTime(session.startTime)}
                                {isFull && " (Full)"}
                              </div>
                            );
                          })}
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
                          {sessions.map(session => {
                            const isFull = session.availableSpots <= 0;
                            return (
                              <div
                                key={session.id}
                                className={`absolute left-0 right-0 mx-1 rounded px-2 py-1 text-xs cursor-pointer overflow-hidden ${
                                  isFull
                                    ? "bg-gray-200 text-gray-600 border-l-4 border-gray-400"
                                    : "bg-blue-200 text-blue-900 border-l-4 border-blue-600 hover:bg-blue-300"
                                }`}
                                style={{
                                  top: `${getSessionPosition(session.startTime) + 48}px`,
                                  height: `${getSessionHeight(session.startTime, session.endTime)}px`,
                                  minHeight: '24px'
                                }}
                                onClick={() => !isFull && handleRegister(session.id)}
                              >
                                <div className="font-semibold">{formatTime(session.startTime)} - {formatTime(session.endTime)}</div>
                                {session.classStep && <div className="text-xs">Part {session.classStep.stepNumber}</div>}
                                {isFull && <div className="text-gray-600">Full</div>}
                              </div>
                            );
                          })}
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
                      {getSessionsForDay(currentDate).map(session => {
                        const isFull = session.availableSpots <= 0;
                        return (
                          <div
                            key={session.id}
                            className={`absolute left-0 right-0 mx-2 rounded px-3 py-2 text-sm cursor-pointer ${
                              isFull
                                ? "bg-gray-200 text-gray-600 border-l-4 border-gray-400"
                                : "bg-blue-200 text-blue-900 border-l-4 border-blue-600 hover:bg-blue-300"
                            }`}
                            style={{
                              top: `${getSessionPosition(session.startTime) + 48}px`,
                              height: `${getSessionHeight(session.startTime, session.endTime)}px`,
                              minHeight: '40px'
                            }}
                            onClick={() => !isFull && handleRegister(session.id)}
                          >
                            <div className="font-bold">{formatTime(session.startTime)} - {formatTime(session.endTime)}</div>
                            {session.classStep && (
                              <div className="text-xs mt-1">Part {session.classStep.stepNumber}: {session.classStep.name}</div>
                            )}
                            {session.topic && <div className="text-xs mt-1">{session.topic}</div>}
                            <div className="text-xs mt-1">
                              {session.currentEnrollment}/{session.maxStudents || classDetails.maxStudents} enrolled
                            </div>
                            {isFull && <div className="text-gray-600 font-semibold mt-1">Full</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* List View */}
              {calendarView === "list" && (
                <div className="space-y-4">
                  {classDetails.sessions.map((session) => {
                    const isFull = session.availableSpots <= 0;
                    const sessionDate = parseLocalDate(session.sessionDate);

                    return (
                      <div
                        key={session.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {format(sessionDate, "EEEE, MMMM d, yyyy")}
                              </h3>
                              {session.classStep && (
                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  Part {session.classStep.stepNumber}:{" "}
                                  {session.classStep.name}
                                </span>
                              )}
                              {isFull ? (
                                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                                  SOLD OUT
                                </span>
                              ) : session.availableSpots <= 3 ? (
                                <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                  {session.availableSpots} SPOTS LEFT
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                  {session.availableSpots} SPOTS AVAILABLE
                                </span>
                              )}
                            </div>

                            <div className="space-y-2 text-gray-600">
                              <p>
                                <span className="font-medium">Time:</span>{" "}
                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              </p>
                              {session.location && (
                                <p>
                                  <span className="font-medium">Location:</span>{" "}
                                  {session.location}
                                </p>
                              )}
                              {session.topic && (
                                <p>
                                  <span className="font-medium">Topic:</span>{" "}
                                  {session.topic}
                                </p>
                              )}
                              <p>
                                <span className="font-medium">Enrolled:</span>{" "}
                                {session.currentEnrollment} /{" "}
                                {session.maxStudents || classDetails.maxStudents}
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="ml-6">
                            {isFull ? (
                              <button
                                onClick={() => handleRegister(session.id)}
                                className="px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                                disabled
                              >
                                Sold Out
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRegister(session.id)}
                                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Book Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && selectedSession && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRegistrationModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Book Your Session
            </h2>
            <div className="mb-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Class</p>
                <p className="text-lg font-semibold text-gray-900">
                  {classDetails.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="text-gray-900">
                  {format(
                    parseLocalDate(selectedSession.sessionDate),
                    "EEEE, MMMM d, yyyy"
                  )}
                </p>
                <p className="text-gray-600">
                  {formatTime(selectedSession.startTime)} - {formatTime(selectedSession.endTime)}
                </p>
              </div>
              {selectedSession.classStep && (
                <div>
                  <p className="text-sm text-gray-500">Course Part</p>
                  <p className="text-gray-900">
                    Part {selectedSession.classStep.stepNumber}:{" "}
                    {selectedSession.classStep.name}
                  </p>
                </div>
              )}

              {/* Guest Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Guests
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedSession.availableSpots}
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {selectedSession.availableSpots} spots available
                </p>
              </div>

              {/* Resource Requirements */}
              {classDetails.resourceRequirements &&
                classDetails.resourceRequirements.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Required Resources
                    </p>
                    <div className="space-y-2">
                      {classDetails.resourceRequirements.map((req) => {
                        const needed = guestCount * req.quantityPerStudent;
                        const available =
                          resourceAvailability[req.resourceId] || 0;
                        const hasEnough = needed <= available;

                        return (
                          <div
                            key={req.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-700">
                              {req.resource.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  hasEnough ? "text-green-600" : "text-red-600"
                                }
                              >
                                {needed} needed, {available} available
                              </span>
                              {hasEnough ? (
                                <svg
                                  className="w-4 h-4 text-green-600"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4 text-red-600"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Price */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Price per person:</span>
                  <span className="font-semibold">
                    {formatPrice(classDetails.price)}
                  </span>
                </div>
                {guestCount > 1 && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-600">
                      Total ({guestCount} guests):
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatPrice(classDetails.price * guestCount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!user && !bookingAsGuest && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-3">
                  To complete your booking:
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Store the current page and session for redirect after login
                      const returnUrl = `/classes/${classId}?sessionId=${selectedSessionId}&autoBook=true`;
                      sessionStorage.setItem("returnUrl", returnUrl);
                      router.push("/login");
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setBookingAsGuest(true)}
                    className="flex-1 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            )}

            {!user && bookingAsGuest && (
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Guest Information
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={guestInfo.name}
                      onChange={(e) =>
                        setGuestInfo({ ...guestInfo, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) =>
                        setGuestInfo({ ...guestInfo, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) =>
                        setGuestInfo({ ...guestInfo, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Section */}
            {showPayment && clientSecret && (
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Payment Information
                </p>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeCheckout
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    amount={classDetails!.price * guestCount}
                    guestCount={guestCount}
                  />
                </Elements>
              </div>
            )}

            {!showPayment && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRegistrationModal(false);
                    setShowPayment(false);
                    setClientSecret(null);
                    setBookingAsGuest(false);
                    setGuestInfo({ name: "", email: "", phone: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {(user || bookingAsGuest) && (
                  <button
                    onClick={handleSubmitRegistration}
                    disabled={
                      registering ||
                      guestCount > selectedSession.availableSpots ||
                      (bookingAsGuest && (!guestInfo.name || !guestInfo.email))
                    }
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {registering ? "Processing..." : "Continue to Payment"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
