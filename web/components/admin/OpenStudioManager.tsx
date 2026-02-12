"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

interface Subscriber {
  id: number;
  customer: { id: number; name: string; email: string };
  membership: { id: number; name: string };
  status: string;
}

export default function OpenStudioManager() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [availability, setAvailability] = useState<{ session: any; resources: ResourceAvailability[] } | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [walkInForm, setWalkInForm] = useState({ subscriptionId: "", resourceId: "" });
  const [walkInError, setWalkInError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchSubscribers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSession) fetchAvailability(selectedSession);
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/open-studio/sessions`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        const today = new Date().toISOString().split("T")[0];
        const todaySession = data.find((s: Session) => s.sessionDate.startsWith(today));
        if (todaySession) setSelectedSession(todaySession.id);
        else if (data.length > 0) setSelectedSession(data[0].id);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/memberships/subscribers?status=ACTIVE`, {
        credentials: "include",
      });
      if (response.ok) setSubscribers(await response.json());
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const fetchAvailability = async (sessionId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/open-studio/sessions/${sessionId}/availability`, {
        credentials: "include",
      });
      if (response.ok) setAvailability(await response.json());
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleWalkIn = async () => {
    if (!walkInForm.subscriptionId || !walkInForm.resourceId || !selectedSession) return;
    setWalkInError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/open-studio/walk-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subscriptionId: parseInt(walkInForm.subscriptionId),
          sessionId: selectedSession,
          resourceId: parseInt(walkInForm.resourceId),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create walk-in");
      }

      setWalkInForm({ subscriptionId: "", resourceId: "" });
      fetchAvailability(selectedSession);
    } catch (err: any) {
      setWalkInError(err.message);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sessions.slice(0, 7).map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSession(s.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${
              selectedSession === s.id ? "bg-blue-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"
            }`}
          >
            <div>{formatDate(s.sessionDate)}</div>
            <div className="text-xs opacity-75">{s.startTime} - {s.endTime}</div>
            <div className="text-xs opacity-75">{s._count.openStudioBookings} booked</div>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Walk-in Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Walk-In Check-In</h3>
          {walkInError && (
            <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">{walkInError}</div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
              <select
                value={walkInForm.subscriptionId}
                onChange={(e) => setWalkInForm({ ...walkInForm, subscriptionId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select member...</option>
                {subscribers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.customer.name} ({s.membership.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
              <select
                value={walkInForm.resourceId}
                onChange={(e) => setWalkInForm({ ...walkInForm, resourceId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select resource...</option>
                {availability?.resources
                  .filter((r) => r.available > 0)
                  .map((r) => (
                    <option key={r.resourceId} value={r.resourceId}>
                      {r.resourceName} ({r.available} available)
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={handleWalkIn}
              disabled={!walkInForm.subscriptionId || !walkInForm.resourceId}
              className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              Check In Walk-In
            </button>
          </div>
        </div>

        {/* Current Bookings */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Resource Status</h3>
          {availability ? (
            <div className="space-y-4">
              {availability.resources.map((r) => (
                <div key={r.resourceId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{r.resourceName}</span>
                    <span className="text-sm text-gray-500">
                      {r.available} of {r.totalQuantity} available
                      {r.heldByClasses > 0 && ` (${r.heldByClasses} held for classes)`}
                    </span>
                  </div>
                  {r.bookings.length > 0 && (
                    <div className="space-y-1">
                      {r.bookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                          <span>{b.startTime} - {b.endTime}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            b.status === "CHECKED_IN" ? "bg-green-100 text-green-700" :
                            b.status === "RESERVED" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.bookings.length === 0 && (
                    <p className="text-sm text-gray-400">No bookings</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Select a session to view resource status.</p>
          )}
        </div>
      </div>
    </div>
  );
}
