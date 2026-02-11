"use client";

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

interface Props {
  sessionStartTime: string;
  sessionEndTime: string;
  resources: ResourceAvailability[];
  onSlotClick: (resourceId: number, startTime: string) => void;
}

export default function AvailabilityGrid({
  sessionStartTime,
  sessionEndTime,
  resources,
  onSlotClick,
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

  const isSlotAvailable = (resource: ResourceAvailability) => {
    return resource.available > 0;
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
                {hour}
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
                const available = isSlotAvailable(resource);

                return (
                  <td
                    key={`${resource.resourceId}-${hour}`}
                    className={`border p-1 text-center cursor-pointer transition-colors ${
                      booked
                        ? "bg-red-100 text-red-700"
                        : available
                          ? "bg-green-50 hover:bg-green-100"
                          : "bg-gray-100 text-gray-400"
                    }`}
                    onClick={() => {
                      if (!booked && available) {
                        onSlotClick(resource.resourceId, hour);
                      }
                    }}
                  >
                    {booked ? (
                      <span className="text-xs">Booked</span>
                    ) : available ? (
                      <span className="text-xs text-green-600">Open</span>
                    ) : (
                      <span className="text-xs">-</span>
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
