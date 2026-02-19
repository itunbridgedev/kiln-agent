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

const SHORT_LABELS: Record<string, string> = {
  CREATED: "Created",
  DOCK_BISQUE: "Dock",
  DRYING: "Drying",
  KILN_BISQUE: "Kiln",
  BISQUE_DONE: "Bisque Done",
  DOCK_GLAZE: "Dock",
  DRYING_GLAZE: "Drying",
  KILN_GLAZE: "Kiln",
  GLAZE_DONE: "Glaze Done",
  PICKUP_READY: "Pickup",
  PICKED_UP: "Done",
};

export default function StatusTimeline({ history, currentStatus }: { history: StatusEntry[]; currentStatus: string }) {
  const allSteps = [
    "CREATED", "DOCK_BISQUE", "DRYING", "KILN_BISQUE", "BISQUE_DONE",
    "DOCK_GLAZE", "DRYING_GLAZE", "KILN_GLAZE", "GLAZE_DONE", "PICKUP_READY", "PICKED_UP",
  ];

  const currentIndex = allSteps.indexOf(currentStatus);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Progress</h3>

      {/* Bisque phase */}
      <div>
        <div className="text-xs font-medium text-gray-400 mb-1.5">Bisque</div>
        <div className="flex items-start">
          {allSteps.slice(0, 5).map((step, i) => {
            const isPast = i <= currentIndex && currentStatus !== "DAMAGED";
            const isCurrent = step === currentStatus;

            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex-shrink-0 w-4 h-4 rounded-full border-2 ${
                      isCurrent
                        ? "border-blue-500 bg-blue-500"
                        : isPast
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300 bg-white"
                    }`}
                  />
                  <span className={`text-[10px] mt-1 text-center leading-tight ${
                    isCurrent ? "text-blue-600 font-semibold" : isPast ? "text-green-600" : "text-gray-400"
                  }`}>
                    {SHORT_LABELS[step]}
                  </span>
                </div>
                {i < 4 && (
                  <div
                    className={`w-6 sm:w-10 h-0.5 mt-[-12px] ${
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
      </div>

      {/* Glaze phase */}
      <div>
        <div className="text-xs font-medium text-gray-400 mb-1.5">Glaze</div>
        <div className="flex items-start">
          {allSteps.slice(5).map((step, i) => {
            const globalIndex = i + 5;
            const isPast = globalIndex <= currentIndex && currentStatus !== "DAMAGED";
            const isCurrent = step === currentStatus;
            const glazeSteps = allSteps.length - 5;

            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex-shrink-0 w-4 h-4 rounded-full border-2 ${
                      isCurrent
                        ? "border-blue-500 bg-blue-500"
                        : isPast
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300 bg-white"
                    }`}
                  />
                  <span className={`text-[10px] mt-1 text-center leading-tight ${
                    isCurrent ? "text-blue-600 font-semibold" : isPast ? "text-green-600" : "text-gray-400"
                  }`}>
                    {SHORT_LABELS[step]}
                  </span>
                </div>
                {i < glazeSteps - 1 && (
                  <div
                    className={`w-6 sm:w-8 h-0.5 mt-[-12px] ${
                      globalIndex < currentIndex && currentStatus !== "DAMAGED"
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
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
