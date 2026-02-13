"use client";

interface WaitlistEntry {
  id: number;
  resourceId: number;
  startTime: string;
  endTime: string;
  position: number;
  subscriptionId: number;
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
  heldSlots?: Array<{ startTime: string; endTime: string }>;
  waitlistCounts?: Record<string, number>;
  waitlistEntries?: WaitlistEntry[];
}

interface Props {
  sessionStartTime: string;
  sessionEndTime: string;
  resources: ResourceAvailability[];
  subscriptionId?: number;
  onSlotClick: (resourceId: number, startTime: string) => void;
  onHeldSlotClick?: (resourceId: number, startTime: string) => void;
  onWaitlistCancel?: (waitlistId: number) => void;
}

function formatHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AvailabilityGrid({
  sessionStartTime,
  sessionEndTime,
  resources,
  subscriptionId,
  onSlotClick,
  onHeldSlotClick,
  onWaitlistCancel,
}: Props) {
  // Generate hour slots from session start to end
  const startHour = parseInt(sessionStartTime.split(":")[0]);
  const endHour = parseInt(sessionEndTime.split(":")[0]);
  const hours: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(`${String(h).padStart(2, "0")}:00`);
  }

  const isSlotBooked = (resource: ResourceAvailability, hour: string) => {
    return resource.bookings.some((b) => {
      return b.startTime <= hour && b.endTime > hour;
    });
  };

  const isSlotHeld = (resource: ResourceAvailability, hour: string) => {
    return (resource.heldSlots || []).some((slot) => {
      return slot.startTime <= hour && slot.endTime > hour;
    });
  };

  const getWaitlistEntry = (resource: ResourceAvailability, hour: string) => {
    if (!subscriptionId || !resource.waitlistEntries) return null;
    return resource.waitlistEntries.find(
      (e) => e.startTime === hour && e.subscriptionId === subscriptionId
    ) || null;
  };

  const getWaitlistCount = (resource: ResourceAvailability, hour: string) => {
    return resource.waitlistCounts?.[hour] || 0;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white border p-2 text-sm font-medium text-gray-700 min-w-[120px]">
              Resource
            </th>
            {hours.map((hour) => (
              <th key={hour} className="border p-2 text-xs text-gray-500 min-w-[60px]">
                {formatHour(hour)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource.resourceId}>
              <td className="sticky left-0 bg-white border p-2 text-sm font-medium">
                <div>{resource.resourceName}</div>
                <div className="text-xs text-gray-400">
                  {resource.available} avail / {resource.totalQuantity} total
                </div>
              </td>
              {hours.map((hour) => {
                const booked = isSlotBooked(resource, hour);
                const held = isSlotHeld(resource, hour);
                const myWaitlist = getWaitlistEntry(resource, hour);
                const waitlistCount = getWaitlistCount(resource, hour);

                return (
                  <td
                    key={`${resource.resourceId}-${hour}`}
                    className={`border p-1 text-center cursor-pointer transition-colors ${
                      myWaitlist
                        ? "bg-amber-50 hover:bg-amber-100"
                        : booked
                          ? "bg-red-100 text-red-700"
                          : held
                            ? "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            : "bg-green-50 hover:bg-green-100"
                    }`}
                    onClick={() => {
                      if (myWaitlist && onWaitlistCancel) {
                        onWaitlistCancel(myWaitlist.id);
                      } else if ((held || booked) && onHeldSlotClick) {
                        onHeldSlotClick(resource.resourceId, hour);
                      } else if (!booked && !held) {
                        onSlotClick(resource.resourceId, hour);
                      }
                    }}
                  >
                    {myWaitlist ? (
                      <div>
                        <span className="text-xs font-medium text-amber-700">Waitlisted</span>
                        <div className="text-[10px] text-amber-500">#{myWaitlist.position}</div>
                      </div>
                    ) : booked ? (
                      <span className="text-xs">Booked</span>
                    ) : held ? (
                      <div>
                        <span className="text-xs">Held</span>
                        {waitlistCount > 0 && (
                          <div className="text-[10px] text-gray-500">{waitlistCount} waiting</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-green-600">Open</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
