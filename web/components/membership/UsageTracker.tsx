"use client";

interface Props {
  bookingsThisWeek: number;
  maxBookingsPerWeek: number;
}

export default function UsageTracker({ bookingsThisWeek, maxBookingsPerWeek }: Props) {
  const percentage = maxBookingsPerWeek > 0 ? Math.min(100, (bookingsThisWeek / maxBookingsPerWeek) * 100) : 0;
  const remaining = Math.max(0, maxBookingsPerWeek - bookingsThisWeek);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Bookings This Week</span>
        <span className="text-sm text-gray-500">
          {bookingsThisWeek} / {maxBookingsPerWeek}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${
            percentage >= 100 ? "bg-red-500" : percentage >= 75 ? "bg-yellow-500" : "bg-blue-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {remaining > 0 ? `${remaining} booking${remaining !== 1 ? "s" : ""} remaining` : "Limit reached"}
      </p>
    </div>
  );
}
