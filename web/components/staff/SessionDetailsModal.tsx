"use client";

import { useEffect, useState } from "react";
import { CalendarEvent } from "./StaffCalendar";

interface Enrollment {
  id: number;
  type: 'registration' | 'reservation';
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  isGuest: boolean;
  guestCount: number;
  registeredAt: string;
  status: string;
}

interface SessionDetailsModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function SessionDetailsModal({
  event,
  onClose,
}: SessionDetailsModalProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [showEnrollments, setShowEnrollments] = useState(false);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);

  useEffect(() => {
    if (event && showEnrollments && enrollments.length === 0) {
      fetchEnrollments();
    }
  }, [event, showEnrollments]);

  const fetchEnrollments = async () => {
    if (!event) return;

    setLoadingEnrollments(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/staff/sessions/${event.id}/enrollments`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[SessionDetailsModal] Enrollments API response:', {
          sessionId: event.id,
          totalEnrollment: data.totalEnrollment,
          enrollmentsCount: data.enrollments?.length,
          enrollments: data.enrollments,
        });
        setEnrollments(data.enrollments || []);
      } else {
        console.error("Failed to fetch enrollments");
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleCheckIn = async (enrollment: Enrollment) => {
    if (enrollment.type !== 'reservation') {
      alert('Can only check in flexible reservations');
      return;
    }

    setCheckingIn(enrollment.id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reservations/${enrollment.id}/check-in`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        // Refresh enrollments to show updated status
        await fetchEnrollments();
      } else {
        const error = await response.json();
        alert(`Failed to check in: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in student');
    } finally {
      setCheckingIn(null);
    }
  };

  const handleUndoCheckIn = async (enrollment: Enrollment) => {
    if (enrollment.type !== 'reservation') {
      return;
    }

    if (!confirm(`Undo check-in for ${enrollment.customerName}?`)) {
      return;
    }

    setCheckingIn(enrollment.id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reservations/${enrollment.id}/undo-check-in`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        // Refresh enrollments to show updated status
        await fetchEnrollments();
      } else {
        const error = await response.json();
        alert(`Failed to undo check-in: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error undoing check-in:', error);
      alert('Failed to undo check-in');
    } finally {
      setCheckingIn(null);
    }
  };

  if (!event) return null;

  // Debug logging
  console.log('[SessionDetailsModal] Event data:', {
    id: event.id,
    title: event.title,
    currentEnrollment: event.currentEnrollment,
    maxStudents: event.maxStudents,
    startTime: event.startTime,
  });

  const startDate =
    typeof event.start === "string" ? new Date(event.start) : event.start;
  const endDate =
    typeof event.end === "string" ? new Date(event.end) : event.end;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const enrollmentPercentage = event.maxStudents
    ? Math.round((event.currentEnrollment / event.maxStudents) * 100)
    : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div
            className="px-6 py-4 border-b border-gray-200"
            style={{
              backgroundColor: event.category?.color
                ? `${event.category.color}20`
                : "#f3f4f6",
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {event.title}
                </h2>
                {event.category && (
                  <span
                    className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: event.category.color || "#3174ad",
                      color: "white",
                    }}
                  >
                    {event.category.name}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {/* Cancellation warning */}
            {event.isCancelled && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="w-6 h-6 text-red-600 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-red-800 font-semibold">
                    This session has been cancelled
                  </span>
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-gray-400 mr-3 mt-0.5"
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
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-gray-900 font-medium">
                    {formatDate(startDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-gray-400 mr-3 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="text-gray-900 font-medium">
                    {formatTime(startDate)} - {formatTime(endDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-gray-400 mr-3 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-gray-900 font-medium">{event.location}</p>
                </div>
              </div>
            )}

            {/* Your Role */}
            {event.userRole && (
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-gray-400 mr-3 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Your Role</p>
                  <p className="text-gray-900 font-medium">
                    {event.userRole.type === "instructor"
                      ? "Instructor 🏆"
                      : "Assistant 🤝"}
                  </p>
                </div>
              </div>
            )}

            {/* Enrollment */}
            {event.maxStudents && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Enrollment</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {event.currentEnrollment} / {event.maxStudents} students
                    </span>
                    {event.currentEnrollment > 0 && (
                      <button
                        onClick={() => setShowEnrollments(!showEnrollments)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        {showEnrollments ? "Hide" : "Show"} Students
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${enrollmentPercentage}%`,
                      backgroundColor:
                        enrollmentPercentage >= 90
                          ? "#ef4444"
                          : enrollmentPercentage >= 70
                            ? "#f59e0b"
                            : "#10b981",
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {enrollmentPercentage}% capacity
                  {event.currentEnrollment > 0 && (
                    <span className="ml-1">
                      • Actual capacity may vary based on resource availability
                    </span>
                  )}
                </p>

                {/* Enrolled Students List */}
                {showEnrollments && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {loadingEnrollments ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : enrollments.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Enrolled Students:
                        </p>
                        {enrollments.map((enrollment, index) => {
                          const isCheckedIn = enrollment.status === 'CHECKED_IN' || enrollment.status === 'ATTENDED';
                          const canCheckIn = enrollment.type === 'reservation' && enrollment.status === 'PENDING';
                          const canUndoCheckIn = enrollment.type === 'reservation' && enrollment.status === 'CHECKED_IN';

                          return (
                            <div
                              key={enrollment.id}
                              className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs font-medium text-gray-500">
                                  {index + 1}.
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900">
                                      {enrollment.customerName}
                                      {enrollment.isGuest && (
                                        <span className="ml-1 text-xs text-gray-500">
                                          (Guest)
                                        </span>
                                      )}
                                    </p>
                                    {isCheckedIn && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        ✓ Checked In
                                      </span>
                                    )}
                                    {enrollment.status === 'PENDING' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                  {enrollment.customerEmail && (
                                    <p className="text-xs text-gray-500">
                                      {enrollment.customerEmail}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {enrollment.guestCount > 1 && (
                                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    +{enrollment.guestCount - 1} guest
                                    {enrollment.guestCount > 2 ? "s" : ""}
                                  </span>
                                )}
                                {canCheckIn && (
                                  <button
                                    onClick={() => handleCheckIn(enrollment)}
                                    disabled={checkingIn === enrollment.id}
                                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
                                  >
                                    {checkingIn === enrollment.id ? 'Checking in...' : 'Check In'}
                                  </button>
                                )}
                                {canUndoCheckIn && (
                                  <button
                                    onClick={() => handleUndoCheckIn(enrollment)}
                                    disabled={checkingIn === enrollment.id}
                                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded transition-colors"
                                    title="Undo check-in"
                                  >
                                    {checkingIn === enrollment.id ? 'Undoing...' : 'Undo'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No students enrolled yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recurring Pattern */}
            {event.schedulePattern && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="text-blue-800 text-sm">
                    This is part of a recurring schedule
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
