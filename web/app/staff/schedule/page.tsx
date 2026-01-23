"use client";

import SessionDetailsModal from "@/components/staff/SessionDetailsModal";
import StaffCalendar, { CalendarEvent } from "@/components/staff/StaffCalendar";
import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function StaffCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  });

  // Fetch sessions from API
  const fetchSessions = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    setError(null);

    try {
      const startParam = start.toISOString().split("T")[0];
      const endParam = end.toISOString().split("T")[0];

      const response = await fetch(
        `${API_BASE_URL}/api/staff/my-sessions?startDate=${startParam}&endDate=${endParam}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to view your schedule");
        }
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      setEvents(data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSessions(dateRange.start, dateRange.end);
  }, []);

  // Handle date range changes from calendar navigation
  const handleDateRangeChange = useCallback(
    (start: Date, end: Date) => {
      setDateRange({ start, end });
      fetchSessions(start, end);
    },
    [fetchSessions]
  );

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
              <p className="mt-2 text-sm text-gray-600">
                View and manage your teaching sessions
              </p>
            </div>

            {/* Legend */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded border-l-4 border-yellow-500" />
                <span className="text-sm text-gray-600">Instructor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded border-l-4 border-green-500" />
                <span className="text-sm text-gray-600">Assistant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-600 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        )}

        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No sessions found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  You don't have any teaching sessions scheduled for this time
                  period.
                </p>
              </div>
            ) : (
              <StaffCalendar
                events={events}
                onEventClick={handleEventClick}
                onDateRangeChange={handleDateRangeChange}
              />
            )}
          </>
        )}
      </div>

      {/* Session Details Modal */}
      <SessionDetailsModal event={selectedEvent} onClose={handleCloseModal} />
    </div>
  );
}
