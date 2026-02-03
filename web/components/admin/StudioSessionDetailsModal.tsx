"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { StudioCalendarEvent } from "./StudioCalendar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  staffTeachingRoles?: {
    role: {
      id: number;
      name: string;
    };
  }[];
}

interface StaffAssignment {
  id: number;
  customerId: number;
  roleId?: number;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  role?: {
    id: number;
    name: string;
  };
}

interface StudioSessionDetailsModalProps {
  event: StudioCalendarEvent | null;
  onClose: () => void;
  onStaffChange?: () => void;
}

export default function StudioSessionDetailsModal({
  event,
  onClose,
  onStaffChange,
}: StudioSessionDetailsModalProps) {
  const [showStaffManager, setShowStaffManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [instructors, setInstructors] = useState<StaffAssignment[]>([]);
  const [assistants, setAssistants] = useState<StaffAssignment[]>([]);
  const [roleType, setRoleType] = useState<"instructor" | "assistant">(
    "instructor"
  );
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event && showStaffManager) {
      fetchStaffData();
    }
  }, [event?.id, showStaffManager]);

  const fetchStaffData = async () => {
    if (!event) return;

    setLoading(true);
    setError(null);

    try {
      const [staffRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/calendar/staff`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/admin/calendar/sessions/${event.id}/staff`, {
          credentials: "include",
        }),
      ]);

      if (!staffRes.ok || !assignmentsRes.ok) {
        throw new Error("Failed to fetch staff data");
      }

      const staffData = await staffRes.json();
      const assignmentsData = await assignmentsRes.json();

      setStaff(staffData);
      setInstructors(assignmentsData.instructors || []);
      setAssistants(assignmentsData.assistants || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaffId || !event) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/calendar/sessions/${event.id}/staff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            customerId: selectedStaffId,
            roleType,
            roleId: selectedRoleId,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign staff");
      }

      // Refresh assignments
      await fetchStaffData();
      setSelectedStaffId(null);
      setSelectedRoleId(null);
      onStaffChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (
    customerId: number,
    assignmentRoleType: "instructor" | "assistant"
  ) => {
    if (!confirm("Remove this staff assignment?") || !event) return;

    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/calendar/sessions/${event.id}/staff/${customerId}/${assignmentRoleType}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to remove assignment");
      }

      // Refresh assignments
      await fetchStaffData();
      onStaffChange?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!event) return null;

  const enrollmentPercent = (event.currentEnrollment / event.maxStudents) * 100;
  const currentInstructors = showStaffManager
    ? instructors
    : event.staff.filter((s: any) => s.roleType === "instructor");
  const currentAssistants = showStaffManager
    ? assistants
    : event.staff.filter((s: any) => s.roleType === "assistant");

  const availableStaff = staff.filter((s) => {
    const alreadyAssigned =
      instructors.some((i) => i?.customerId === s.id) ||
      assistants.some((a) => a?.customerId === s.id);
    return !alreadyAssigned;
  });

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);
  const availableRoles = selectedStaff?.staffTeachingRoles || [];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {event.className}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Time & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Date & Time
              </label>
              <p className="text-gray-900 mt-1">
                {format(new Date(event.start), "EEEE, MMMM d, yyyy")}
                <br />
                {format(new Date(event.start), "h:mm a")} -{" "}
                {format(new Date(event.end), "h:mm a")}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Category
              </label>
              <p className="text-gray-900 mt-1">{event.categoryName}</p>
            </div>
          </div>

          {/* Enrollment Status */}
          <div>
            <label className="text-sm font-medium text-gray-500">
              Enrollment
            </label>
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {event.currentEnrollment} of {event.maxStudents} students
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.round(enrollmentPercent)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    enrollmentPercent >= 100
                      ? "bg-red-500"
                      : enrollmentPercent >= 75
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(enrollmentPercent, 100)}%` }}
                />
              </div>
              {event.isFull && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  ⚠️ Class is full
                </p>
              )}
            </div>
          </div>

          {/* Staff Assignments Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Staff Assignments
              </h3>
              <button
                onClick={() => setShowStaffManager(!showStaffManager)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showStaffManager ? "Cancel" : "Manage Staff"}
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}

            {/* Instructors */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Instructors ({currentInstructors.length})
              </h4>
              {currentInstructors.length > 0 ? (
                <div className="space-y-2">
                  {currentInstructors
                    .filter((i: any) => i?.customer || i?.name)
                    .map((instructor: any) => (
                      <div
                        key={instructor.id}
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {(instructor.customer?.name || instructor.name)
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {instructor.customer?.name || instructor.name}
                          </p>
                          {instructor.role?.name && (
                            <p className="text-xs text-blue-600">
                              Role: {instructor.role.name}
                            </p>
                          )}
                          {instructor.roleName && !instructor.role && (
                            <p className="text-sm text-gray-600">
                              {instructor.roleName}
                            </p>
                          )}
                        </div>
                        {showStaffManager && instructor.customerId && (
                          <button
                            onClick={() =>
                              handleRemove(instructor.customerId, "instructor")
                            }
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Remove instructor"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                        {!showStaffManager && (
                          <span className="text-2xl">🏆</span>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No instructor assigned
                  </p>
                </div>
              )}
            </div>

            {/* Assistants */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Assistants ({currentAssistants.length})
              </h4>
              {currentAssistants.length > 0 ? (
                <div className="space-y-2">
                  {currentAssistants
                    .filter((a: any) => a?.customer || a?.name)
                    .map((assistant: any) => (
                      <div
                        key={assistant.id}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                          {(assistant.customer?.name || assistant.name)
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {assistant.customer?.name || assistant.name}
                          </p>
                          {assistant.role?.name && (
                            <p className="text-xs text-green-600">
                              Role: {assistant.role.name}
                            </p>
                          )}
                          {assistant.roleName && !assistant.role && (
                            <p className="text-sm text-gray-600">
                              {assistant.roleName}
                            </p>
                          )}
                        </div>
                        {showStaffManager && assistant.customerId && (
                          <button
                            onClick={() =>
                              handleRemove(assistant.customerId, "assistant")
                            }
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Remove assistant"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                        {!showStaffManager && (
                          <span className="text-2xl">🤝</span>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No assistants assigned
                </p>
              )}
            </div>

            {/* Add Staff Form */}
            {showStaffManager && availableStaff.length > 0 && (
              <div className="border-t pt-4">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Add Staff Member
                    </h4>

                    {/* Role Type */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Assignment Type
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="instructor"
                            checked={roleType === "instructor"}
                            onChange={(e) =>
                              setRoleType(e.target.value as "instructor")
                            }
                            className="mr-2"
                          />
                          <span className="text-sm">Instructor</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="assistant"
                            checked={roleType === "assistant"}
                            onChange={(e) =>
                              setRoleType(e.target.value as "assistant")
                            }
                            className="mr-2"
                          />
                          <span className="text-sm">Assistant</span>
                        </label>
                      </div>
                    </div>

                    {/* Staff Selector */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Select Staff Member
                      </label>
                      <select
                        value={selectedStaffId || ""}
                        onChange={(e) => {
                          setSelectedStaffId(
                            e.target.value ? parseInt(e.target.value) : null
                          );
                          setSelectedRoleId(null);
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Staff --</option>
                        {availableStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Teaching Role Selector */}
                    {selectedStaffId && availableRoles.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Teaching Role (optional)
                        </label>
                        <select
                          value={selectedRoleId || ""}
                          onChange={(e) =>
                            setSelectedRoleId(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- No specific role --</option>
                          {availableRoles.map((tr) => (
                            <option key={tr.role.id} value={tr.role.id}>
                              {tr.role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={handleAssign}
                      disabled={!selectedStaffId || saving}
                      className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {saving ? "Assigning..." : "Add Assignment"}
                    </button>
                  </>
                )}
              </div>
            )}

            {showStaffManager && availableStaff.length === 0 && !loading && (
              <p className="text-sm text-gray-500 italic text-center py-3">
                All available staff members are already assigned
              </p>
            )}
          </div>

          {/* Conflict Warning */}
          {event.hasConflict && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Scheduling conflict detected: One or more staff members are
                assigned to overlapping sessions.
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
