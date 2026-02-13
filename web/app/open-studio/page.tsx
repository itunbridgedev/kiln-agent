"use client";

import AvailabilityGrid from "@/components/open-studio/AvailabilityGrid";
import BookingModal from "@/components/open-studio/BookingModal";
import { useAuth } from "@/context/AuthContext";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Session {
  id: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  class: { id: number; name: string };
  _count: { openStudioBookings: number };
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  session: Session;
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

function combineDateAndTime(dateStr: string, timeStr: string): Date {
  // dateStr may be ISO like "2026-02-12T00:00:00.000Z" or just "2026-02-12"
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

const calendarFormats = {
  timeGutterFormat: "h:mm a",
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
  agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
  dayHeaderFormat: "EEEE, MMMM d",
};

export default function OpenStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const availabilityRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
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
      // Auto-select first session so availability shows immediately
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

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      sessions.map((s) => ({
        id: s.id,
        title: s.class.name,
        start: combineDateAndTime(s.sessionDate, s.startTime),
        end: combineDateAndTime(s.sessionDate, s.endTime),
        session: s,
      })),
    [sessions]
  );

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedSession(event.id);
    // Scroll availability into view on mobile
    setTimeout(() => {
      availabilityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const isSelected = event.id === selectedSession;
      return {
        style: {
          backgroundColor: isSelected ? "#1d4ed8" : "#2563eb",
          borderColor: isSelected ? "#1e3a8a" : "#1d4ed8",
          borderRadius: "6px",
          padding: "2px 6px",
          cursor: "pointer",
          outline: isSelected ? "2px solid #93c5fd" : "none",
          outlineOffset: "1px",
          opacity: isSelected ? 1 : 0.8,
        },
      };
    },
    [selectedSession]
  );

  const EventComponent = ({ event }: { event: CalendarEvent }) => (
    <div className="rbc-event-content">
      <strong>{event.title}</strong>
      <div className="text-xs opacity-80">
        {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
      </div>
    </div>
  );

  const formatHour = (time: string): string => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
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
        {sessions.length > 0 ? (
          <div className="space-y-6">
            {/* Availability Grid - above calendar for visibility */}
            {availability && selectedSession && (
              <div ref={availabilityRef} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-lg">{availability.session.className}</h2>
                    <p className="text-sm text-gray-500">
                      {format(combineDateAndTime(availability.session.sessionDate, availability.session.startTime), "EEEE, MMMM d")} &middot;{" "}
                      {formatHour(availability.session.startTime)} - {formatHour(availability.session.endTime)}
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

            {/* Calendar - session picker */}
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Click a session on the calendar to view availability
              </p>
              <div className="open-studio-calendar-container" style={{ height: "calc(100vh - 300px)", minHeight: "500px" }}>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%" }}
                  view={view}
                  onView={handleViewChange}
                  date={date}
                  onNavigate={handleNavigate}
                  onSelectEvent={handleEventClick}
                  eventPropGetter={eventStyleGetter}
                  components={{ event: EventComponent }}
                  views={["month", "week", "day", "agenda"]}
                  step={30}
                  showMultiDayTimes
                  min={new Date(0, 0, 0, 7, 0, 0)}
                  max={new Date(0, 0, 0, 23, 59, 59)}
                  formats={calendarFormats}
                />
              </div>
            </div>
          </div>
        ) : (
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

      <style jsx global>{`
        .open-studio-calendar-container {
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .open-studio-calendar-container .rbc-calendar {
          font-family: inherit;
        }

        .open-studio-calendar-container .rbc-event {
          padding: 2px 5px;
          border-radius: 6px;
          cursor: pointer;
        }

        .open-studio-calendar-container .rbc-event-content {
          font-size: 0.85rem;
          line-height: 1.3;
        }

        .open-studio-calendar-container .rbc-toolbar {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .open-studio-calendar-container .rbc-toolbar button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .open-studio-calendar-container .rbc-toolbar button:hover {
          background: #f5f5f5;
        }

        .open-studio-calendar-container .rbc-toolbar button.rbc-active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .open-studio-calendar-container .rbc-today {
          background-color: #eff6ff !important;
        }

        .open-studio-calendar-container .rbc-off-range-bg {
          background: #fafafa;
        }

        @media (max-width: 768px) {
          .open-studio-calendar-container {
            padding: 10px;
          }

          .open-studio-calendar-container .rbc-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .open-studio-calendar-container .rbc-toolbar-label {
            text-align: center;
            margin: 10px 0;
          }

          .open-studio-calendar-container .rbc-event-content {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
