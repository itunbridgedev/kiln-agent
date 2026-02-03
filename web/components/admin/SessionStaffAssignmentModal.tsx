"use client";

import { useEffect, useState } from "react";

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

interface SessionStaffAssignmentModalProps {
  sessionId: number;
  sessionTitle: string;
  onClose: () => void;
  onAssignmentChange: () => void;
}

export default function SessionStaffAssignmentModal({
  sessionId,
  sessionTitle,
  onClose,
  onAssignmentChange,
}: SessionStaffAssignmentModalProps) {
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
    fetchData();
  }, [sessionId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [staffRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/calendar/staff`, {
          credentials: "include",
        }),
        fetch(
          `${API_BASE_URL}/api/admin/calendar/sessions/${sessionId}/staff`,
          {
            credentials: "include",
          }
        ),
      ]);

      if (!staffRes.ok || !assignmentsRes.ok) {
        throw new Error("Failed to fetch data");
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
    if (!selectedStaffId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/calendar/sessions/${sessionId}/staff`,
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
      await fetchData();
      setSelectedStaffId(null);
      setSelectedRoleId(null);
      onAssignmentChange();
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
    if (!confirm("Remove this staff assignment?")) return;

    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/calendar/sessions/${sessionId}/staff/${customerId}/${assignmentRoleType}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to remove assignment");
      }

      // Refresh assignments
      await fetchData();
      onAssignmentChange();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const availableStaff = staff.filter((s) => {
    const alreadyAssigned =
      instructors.some((i) => i?.customerId === s.id) ||
      assistants.some((a) => a?.customerId === s.id);
    return !alreadyAssigned;
  });

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);
  const availableRoles = selectedStaff?.staffTeachingRoles || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Manage Staff Assignments
              </h2>
              <p className="text-sm text-gray-600 mt-1">{sessionTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {/* Current Assignments */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Current Assignments
                </h3>

                {/* Instructors */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Instructors
                  </h4>
                  {instructors.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No instructors assigned
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {instructors
                        .filter((i) => i?.customer)
                        .map((instructor) => (
                          <div
                            key={instructor.id}
                            className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg p-3"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {instructor.customer?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {instructor.customer?.email}
                              </p>
                              {instructor.role && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Role: {instructor.role.name}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                handleRemove(
                                  instructor.customerId,
                                  "instructor"
                                )
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
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Assistants */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Assistants
                  </h4>
                  {assistants.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No assistants assigned
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {assistants
                        .filter((a) => a?.customer)
                        .map((assistant) => (
                          <div
                            key={assistant.id}
                            className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-3"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {assistant.customer?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {assistant.customer?.email}
                              </p>
                              {assistant.role && (
                                <p className="text-xs text-green-600 mt-1">
                                  Role: {assistant.role.name}
                                </p>
                              )}
                            </div>
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
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Assignment */}
              {availableStaff.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Add Staff Assignment
                  </h3>

                  {/* Role Type Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Staff --</option>
                      {availableStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Teaching Role Selector (optional) */}
                  {selectedStaffId && availableRoles.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teaching Role (optional)
                      </label>
                      <select
                        value={selectedRoleId || ""}
                        onChange={(e) =>
                          setSelectedRoleId(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? "Assigning..." : "Add Assignment"}
                  </button>
                </div>
              )}

              {availableStaff.length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  All available staff members are already assigned to this
                  session
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
