"use client";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Configure date-fns localizer for React Big Calendar
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Calendar event type
export interface CalendarEvent {
  id: number;
  title: string;
  start: string | Date;
  end: string | Date;
  location?: string;
  maxStudents?: number;
  currentEnrollment: number;
  isCancelled: boolean;
  category?: {
    id: number;
    name: string;
    color?: string;
  };
  userRole?: {
    type: "instructor" | "assistant";
    name: string;
  };
  schedulePattern?: {
    id: number;
    recurrenceRule: string;
  } | null;
}

interface StaffCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateRangeChange?: (start: Date, end: Date) => void;
  view: View;
  onViewChange: (view: View) => void;
  date: Date;
  onDateChange: (date: Date) => void;
}

export default function StaffCalendar({
  events,
  onEventClick,
  onDateRangeChange,
  view,
  onViewChange,
  date,
  onDateChange,
}: StaffCalendarProps) {
  // Convert string dates to Date objects
  const formattedEvents = events.map((event) => ({
    ...event,
    start:
      typeof event.start === "string" ? new Date(event.start) : event.start,
    end: typeof event.end === "string" ? new Date(event.end) : event.end,
  }));

  // Custom event styling based on category color and cancellation status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = event.category?.color || "#3174ad";
    let borderColor = backgroundColor;
    let opacity = 1;

    // Dim cancelled sessions
    if (event.isCancelled) {
      opacity = 0.5;
      backgroundColor = "#999";
      borderColor = "#666";
    } else if (event.currentEnrollment === 0) {
      // Set 50% opacity for empty classes (no enrollments)
      opacity = 0.5;
    }

    // Add role indicator - instructors get solid, assistants get striped
    const style: React.CSSProperties = {
      backgroundColor,
      borderColor,
      opacity,
      borderLeft:
        event.userRole?.type === "instructor"
          ? "4px solid #FFD700"
          : "4px solid #4CAF50",
    };

    return { style };
  }, []);

  // Custom event component to show more info
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const enrollmentPercentage = event.maxStudents
      ? Math.round((event.currentEnrollment / event.maxStudents) * 100)
      : 0;

    return (
      <div className="rbc-event-content">
        <strong>{event.title}</strong>
        {event.location && <div className="text-xs">📍 {event.location}</div>}
        {event.maxStudents && (
          <div className="text-xs">
            👥 {event.currentEnrollment}/{event.maxStudents} (
            {enrollmentPercentage}%)
          </div>
        )}
        {event.isCancelled && (
          <div className="text-xs font-bold">❌ CANCELLED</div>
        )}
      </div>
    );
  };

  // Handle view or date change - notify parent to fetch new data
  const handleNavigate = useCallback(
    (newDate: Date) => {
      onDateChange(newDate);

      // Calculate date range based on view
      let start = new Date(newDate);
      let end = new Date(newDate);

      if (view === "month") {
        start = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 1); // Next month's first day
      } else if (view === "week") {
        start = startOfWeek(newDate);
        end = new Date(start);
        end.setDate(start.getDate() + 7); // Include full 7 days
      } else if (view === "day") {
        start.setHours(0, 0, 0, 0);
        end = new Date(newDate);
        end.setHours(23, 59, 59, 999);
      }

      onDateRangeChange?.(start, end);
    },
    [view, date, onDateRangeChange, onDateChange]
  );

  const handleViewChange = useCallback(
    (newView: View) => {
      onViewChange(newView);

      // Calculate date range based on new view
      let start = new Date(date);
      let end = new Date(date);

      if (newView === "month") {
        start = new Date(date.getFullYear(), date.getMonth(), 1);
        end = new Date(date.getFullYear(), date.getMonth() + 1, 1); // Next month's first day
      } else if (newView === "week") {
        start = startOfWeek(date);
        end = new Date(start);
        end.setDate(start.getDate() + 7); // Include full 7 days
      } else if (newView === "day") {
        start.setHours(0, 0, 0, 0);
        end = new Date(date);
        end.setHours(23, 59, 59, 999);
      }

      onDateRangeChange?.(start, end);
    },
    [view, date, onDateRangeChange, onViewChange]
  );

  return (
    <div
      className="staff-calendar-container"
      style={{ height: "calc(100vh - 200px)" }}
    >
      <Calendar
        localizer={localizer}
        events={formattedEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        view={view}
        onView={handleViewChange}
        date={date}
        onNavigate={handleNavigate}
        onSelectEvent={onEventClick}
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
        }}
        views={["month", "week", "day"]}
        step={30}
        showMultiDayTimes
        min={new Date(0, 0, 0, 7, 0, 0)}
        max={new Date(0, 0, 0, 23, 59, 59)}
        defaultDate={new Date()}
      />

      <style jsx global>{`
        .staff-calendar-container {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .rbc-calendar {
          font-family: inherit;
        }

        .rbc-event {
          padding: 2px 5px;
          border-radius: 4px;
          cursor: pointer;
        }

        .rbc-event-content {
          font-size: 0.85rem;
          line-height: 1.3;
        }

        .rbc-toolbar {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .rbc-toolbar button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .rbc-toolbar button:hover {
          background: #f5f5f5;
        }

        .rbc-toolbar button.rbc-active {
          background: #3174ad;
          color: white;
          border-color: #3174ad;
        }

        .rbc-today {
          background-color: #f0f8ff !important;
        }

        .rbc-off-range-bg {
          background: #fafafa;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .staff-calendar-container {
            padding: 10px;
            height: calc(100vh - 150px);
          }

          .rbc-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .rbc-toolbar-label {
            text-align: center;
            margin: 10px 0;
          }

          .rbc-event-content {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
