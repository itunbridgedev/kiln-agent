"use client";

import { useState } from "react";

interface Props {
  sessionId: number;
  resourceId: number;
  resourceName: string;
  sessionStartTime: string;
  sessionEndTime: string;
  preselectedStartTime: string;
  maxBlockMinutes: number;
  subscriptionId?: number;
  punchPassId?: number;
  onClose: () => void;
  onBookingCreated: () => void;
}

function formatHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function BookingModal({
  sessionId,
  resourceId,
  resourceName,
  sessionStartTime,
  sessionEndTime,
  preselectedStartTime,
  maxBlockMinutes,
  subscriptionId,
  punchPassId,
  onClose,
  onBookingCreated,
}: Props) {
  const [startTime, setStartTime] = useState(preselectedStartTime);
  const [duration, setDuration] = useState(Math.min(120, maxBlockMinutes));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateEndTime = (start: string, durationMin: number): string => {
    const [h, m] = start.split(":").map(Number);
    const totalMin = h * 60 + m + durationMin;
    const endH = Math.floor(totalMin / 60);
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const endTime = calculateEndTime(startTime, duration);

  // Generate start time options (every 30 min within session)
  const startOptions: string[] = [];
  const sessStartH = parseInt(sessionStartTime.split(":")[0]);
  const sessEndH = parseInt(sessionEndTime.split(":")[0]);
  for (let h = sessStartH; h < sessEndH; h++) {
    startOptions.push(`${String(h).padStart(2, "0")}:00`);
    startOptions.push(`${String(h).padStart(2, "0")}:30`);
  }

  // Duration options (30 min increments up to max)
  const durationOptions: number[] = [];
  for (let d = 30; d <= maxBlockMinutes; d += 30) {
    durationOptions.push(d);
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const body: any = {
        sessionId,
        resourceId,
        startTime,
        endTime,
      };

      // Send either subscription or punch pass ID
      if (subscriptionId) {
        body.subscriptionId = subscriptionId;
      } else if (punchPassId) {
        body.customerPunchPassId = punchPassId;
      } else {
        throw new Error("No valid pass type found");
      }

      const response = await fetch("/api/open-studio/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create booking");
      }

      onBookingCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Book Open Studio Time</h2>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Resource</p>
            <p className="font-medium">{resourceName}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {startOptions.map((t) => (
                <option key={t} value={t}>{formatHour(t)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              {durationOptions.map((d) => (
                <option key={d} value={d}>
                  {d >= 60 ? `${Math.floor(d / 60)}h ${d % 60 ? `${d % 60}m` : ""}` : `${d}m`}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Your booking</p>
            <p className="font-medium">{formatHour(startTime)} - {formatHour(endTime)}</p>
            <p className="text-sm text-gray-500">{duration} minutes on {resourceName}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
