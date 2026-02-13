"use client";

import { useState } from "react";

interface Props {
  sessionId: number;
  resourceId: number;
  resourceName: string;
  startTime: string;
  sessionDate: string;
  waitlistCount: number;
  subscriptionId: number;
  sessionEndTime: string;
  onClose: () => void;
  onJoined: () => void;
}

function formatHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function WaitlistModal({
  sessionId,
  resourceId,
  resourceName,
  startTime,
  sessionDate,
  waitlistCount,
  subscriptionId,
  sessionEndTime,
  onClose,
  onJoined,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default end time: 1 hour after start, capped at session end
  const startH = parseInt(startTime.split(":")[0]);
  const endH = Math.min(startH + 1, parseInt(sessionEndTime.split(":")[0]));
  const endTime = `${String(endH).padStart(2, "0")}:00`;

  const position = waitlistCount + 1;

  const handleJoin = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/open-studio/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subscriptionId,
          sessionId,
          resourceId,
          startTime,
          endTime,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join waitlist");
      }

      onJoined();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const dateStr = new Date(sessionDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Join Waitlist</h2>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Resource</p>
            <p className="font-medium">{resourceName}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Time Slot</p>
            <p className="font-medium">{formatHour(startTime)} — {dateStr}</p>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-sm text-amber-800">
              This slot is currently unavailable. You will be <strong>#{position}</strong> in line.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              If the slot opens up (e.g. class cancelled or booking cancelled), you'll be automatically booked.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting ? "Joining..." : "Join Waitlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
