"use client";

import { useEffect, useState } from "react";

interface PunchPassOption {
  id: number;
  name: string;
  punchesRemaining: number;
}

interface SubscriptionOption {
  id: number;
  membershipName: string;
  bookingsThisWeek: number;
  maxBookingsPerWeek: number;
}

interface Props {
  sessionId: number;
  resourceId: number;
  resourceName: string;
  sessionStartTime: string;
  sessionEndTime: string;
  preselectedStartTime: string;
  maxBlockMinutes: number;
  subscription?: SubscriptionOption | null;
  punchPasses: PunchPassOption[];
  onClose: () => void;
  onBookingCreated: () => void;
}

function formatHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

type PayMethod = "subscription" | "punchpass";

export default function BookingModal({
  sessionId,
  resourceId,
  resourceName,
  sessionStartTime,
  sessionEndTime,
  preselectedStartTime,
  maxBlockMinutes,
  subscription,
  punchPasses,
  onClose,
  onBookingCreated,
}: Props) {
  const [startTime, setStartTime] = useState(preselectedStartTime);
  const [duration, setDuration] = useState(Math.min(120, maxBlockMinutes));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionAvailable =
    subscription != null &&
    subscription.bookingsThisWeek < subscription.maxBookingsPerWeek;

  const hasPunchPasses = punchPasses.length > 0;

  // Determine if we need to ask the user which method to use
  const needsChoice = !subscriptionAvailable && hasPunchPasses && subscription != null;

  // Auto-select payment method
  const autoMethod: PayMethod | null = subscriptionAvailable
    ? "subscription"
    : !subscription && hasPunchPasses
      ? "punchpass"
      : null;

  const [payMethod, setPayMethod] = useState<PayMethod | null>(autoMethod);
  const [selectedPunchPassId, setSelectedPunchPassId] = useState<number | undefined>(
    punchPasses.length > 0 ? punchPasses[0].id : undefined
  );

  // If needsChoice and user hasn't picked yet, payMethod is null
  useEffect(() => {
    if (autoMethod) setPayMethod(autoMethod);
  }, [autoMethod]);

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

      if (payMethod === "subscription" && subscription) {
        body.subscriptionId = subscription.id;
      } else if (payMethod === "punchpass" && selectedPunchPassId) {
        body.customerPunchPassId = selectedPunchPassId;
      } else {
        throw new Error("Please select a booking method");
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

          {/* Payment method selection — only shown when membership limit reached */}
          {needsChoice && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                You've used {subscription!.bookingsThisWeek}/{subscription!.maxBookingsPerWeek} membership
                bookings this week.
              </p>
              <p className="text-sm text-amber-700 mb-3">
                Would you like to use a punch pass for this booking?
              </p>
              <div className="space-y-2">
                {punchPasses.map((pass) => (
                  <label
                    key={pass.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                      payMethod === "punchpass" && selectedPunchPassId === pass.id
                        ? "border-amber-400 bg-white"
                        : "border-transparent hover:bg-amber-100/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={payMethod === "punchpass" && selectedPunchPassId === pass.id}
                      onChange={() => {
                        setPayMethod("punchpass");
                        setSelectedPunchPassId(pass.id);
                      }}
                      className="accent-amber-600"
                    />
                    <div>
                      <span className="text-sm font-medium">{pass.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({pass.punchesRemaining} punches remaining)
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Show which method will be used (when auto-selected) */}
          {!needsChoice && payMethod && (
            <div className="text-xs text-gray-500">
              {payMethod === "subscription"
                ? `Using membership (${subscription!.bookingsThisWeek + 1}/${subscription!.maxBookingsPerWeek} bookings this week)`
                : `Using punch pass (${punchPasses.find((p) => p.id === selectedPunchPassId)?.punchesRemaining ?? 0} punches remaining)`}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !payMethod}
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
