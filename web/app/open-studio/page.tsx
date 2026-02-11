"use client";

import AvailabilityGrid from "@/components/open-studio/AvailabilityGrid";
import BookingModal from "@/components/open-studio/BookingModal";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Session {
  id: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  class: { id: number; name: string };
  _count: { openStudioBookings: number };
}

interface ResourceAvailability {
  resourceId: number;
  resourceName: string;
  totalQuantity: number;
  heldByClasses: number;
  currentlyBooked: number;
  available: number;
  bookings: Array<{
    id: number;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

interface AvailabilityData {
  session: {
    id: number;
    sessionDate: string;
    startTime: string;
    endTime: string;
    className: string;
  };
  resources: ResourceAvailability[];
}

interface Subscription {
  id: number;
  membership: {
    id: number;
    name: string;
    benefits: any;
  };
  status: string;
}

export default function OpenStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState<{
    resourceId: number;
    resourceName: string;
    startTime: string;
  } | null>(null);

  useEffect(() => {
    fetchSessions();
    if (user) fetchSubscription();
  }, [user]);

  useEffect(() => {
    if (selectedSession) fetchAvailability(selectedSession);
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/open-studio/sessions", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setSessions(data);
      if (data.length > 0) setSelectedSession(data[0].id);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/memberships/my-subscription", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
    }
  };

  const fetchAvailability = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/open-studio/sessions/${sessionId}/availability`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch availability");
      setAvailability(await response.json());
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleSlotClick = (resourceId: number, startTime: string) => {
    if (!user) {
      router.push("/login?returnTo=/open-studio");
      return;
    }
    if (!subscription) {
      router.push("/memberships");
      return;
    }

    const resource = availability?.resources.find((r) => r.resourceId === resourceId);
    setBookingModal({
      resourceId,
      resourceName: resource?.resourceName || "",
      startTime,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Open Studio</h1>
          <p className="text-gray-600 mt-1">
            Reserve a wheel for your next pottery session
          </p>
          {subscription && (
            <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-sm">
              <span className="font-medium text-blue-700">{subscription.membership.name}</span>
              <span className="text-blue-500">member</span>
            </div>
          )}
          {!subscription && user && (
            <div className="mt-2">
              <a href="/memberships" className="text-blue-600 hover:underline text-sm">
                Get a membership to book Open Studio time &rarr;
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Session Selector */}
        {sessions.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedSession === s.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border hover:bg-gray-50"
                }`}
              >
                <div>{formatDate(s.sessionDate)}</div>
                <div className="text-xs opacity-75">
                  {s.startTime} - {s.endTime}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Availability Grid */}
        {availability && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">{availability.session.className}</h2>
                <p className="text-sm text-gray-500">
                  {formatDate(availability.session.sessionDate)} &middot;{" "}
                  {availability.session.startTime} - {availability.session.endTime}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Booked
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Unavailable
                </span>
              </div>
            </div>
            <AvailabilityGrid
              sessionStartTime={availability.session.startTime}
              sessionEndTime={availability.session.endTime}
              resources={availability.resources}
              onSlotClick={handleSlotClick}
            />
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No upcoming Open Studio sessions available.
          </div>
        )}

        {/* Booking Modal */}
        {bookingModal && subscription && availability && (
          <BookingModal
            sessionId={selectedSession!}
            resourceId={bookingModal.resourceId}
            resourceName={bookingModal.resourceName}
            sessionStartTime={availability.session.startTime}
            sessionEndTime={availability.session.endTime}
            preselectedStartTime={bookingModal.startTime}
            maxBlockMinutes={
              subscription.membership.benefits?.openStudio?.maxBlockMinutes || 120
            }
            subscriptionId={subscription.id}
            onClose={() => setBookingModal(null)}
            onBookingCreated={() => {
              setBookingModal(null);
              if (selectedSession) fetchAvailability(selectedSession);
            }}
          />
        )}
      </main>
    </div>
  );
}
