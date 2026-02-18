"use client";

import { format, parseISO } from "date-fns";
import { STATUS_CONFIG } from "./StatusBadge";

interface StatusEntry {
  id: number;
  fromStatus: string;
  toStatus: string;
  changedBy?: { id: number; name: string } | null;
  note?: string | null;
  changedAt: string;
}

export default function StatusTimeline({ history, currentStatus }: { history: StatusEntry[]; currentStatus: string }) {
  const allSteps = [
    "CREATED", "DRYING", "DOCK_BISQUE", "KILN_BISQUE", "BISQUE_DONE",
    "DOCK_GLAZE", "KILN_GLAZE", "GLAZE_DONE", "PICKUP_READY", "PICKED_UP",
  ];

  const currentIndex = allSteps.indexOf(currentStatus);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Progress</h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {allSteps.map((step, i) => {
          const config = STATUS_CONFIG[step];
          const isPast = i <= currentIndex && currentStatus !== "DAMAGED";
          const isCurrent = step === currentStatus;

          return (
            <div key={step} className="flex items-center">
              <div
                className={`flex-shrink-0 w-3 h-3 rounded-full border-2 ${
                  isCurrent
                    ? "border-blue-500 bg-blue-500"
                    : isPast
                      ? "border-green-500 bg-green-500"
                      : "border-gray-300 bg-white"
                }`}
                title={config?.label || step}
              />
              {i < allSteps.length - 1 && (
                <div
                  className={`w-4 h-0.5 ${
                    i < currentIndex && currentStatus !== "DAMAGED"
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {currentStatus === "DAMAGED" && (
        <div className="text-xs text-red-600 font-medium">Marked as damaged</div>
      )}

      {history.length > 0 && (
        <div className="space-y-2 mt-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase">History</h4>
          {history.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-gray-400 flex-shrink-0">
                {format(parseISO(entry.changedAt), "MMM d, h:mm a")}
              </span>
              <span>
                {STATUS_CONFIG[entry.fromStatus]?.label} &rarr; {STATUS_CONFIG[entry.toStatus]?.label}
                {entry.changedBy && <span className="text-gray-400"> by {entry.changedBy.name}</span>}
                {entry.note && <span className="italic text-gray-400"> — {entry.note}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
