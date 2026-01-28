import { format, getDay, parse, startOfWeek } from "date-fns";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export interface StudioCalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  classId: number;
  className: string;
  categoryName: string;
  categoryId: number;
  maxStudents: number;
  currentEnrollment: number;
  isFull: boolean;
  staff: Array<{
    id: number;
    name: string;
    email: string;
    roleType: "instructor" | "assistant";
    roleName: string;
  }>;
  instructorCount: number;
  assistantCount: number;
  hasConflict: boolean;
}

interface StudioCalendarProps {
  events: StudioCalendarEvent[];
  onEventClick: (event: StudioCalendarEvent) => void;
  onDateRangeChange: (start: Date, end: Date) => void;
  view: View;
  onViewChange: (view: View) => void;
  date: Date;
  onDateChange: (date: Date) => void;
}

// Generate consistent colors for staff members
const staffColors = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
];

const staffColorMap = new Map<number, string>();

function getStaffColor(staffId: number): string {
  if (!staffColorMap.has(staffId)) {
    const colorIndex = staffColorMap.size % staffColors.length;
    staffColorMap.set(staffId, staffColors[colorIndex]);
  }
  return staffColorMap.get(staffId)!;
}

export default function StudioCalendar({
  events,
  onEventClick,
  onDateRangeChange,
  view,
  onViewChange,
  date,
  onDateChange,
}: StudioCalendarProps) {
  // Custom event style based on primary instructor
  const eventStyleGetter = (event: StudioCalendarEvent) => {
    const primaryInstructor = event.staff.find(
      (s) => s.roleType === "instructor"
    );
    const backgroundColor = primaryInstructor
      ? getStaffColor(primaryInstructor.id)
      : "#6B7280"; // gray for unassigned

    const opacity = event.isFull ? 0.8 : 1;
    const borderStyle = event.hasConflict ? "2px dashed #DC2626" : "none";

    return {
      style: {
        backgroundColor,
        opacity,
        border: borderStyle,
        borderRadius: "4px",
        color: "white",
        fontSize: "0.875rem",
      },
    };
  };

  // Custom event component with capacity indicator
  const EventComponent = ({ event }: { event: StudioCalendarEvent }) => {
    const enrollmentPercent =
      (event.currentEnrollment / event.maxStudents) * 100;
    const capacityColor =
      enrollmentPercent >= 100
        ? "bg-red-500"
        : enrollmentPercent >= 75
          ? "bg-yellow-500"
          : "bg-green-500";

    return (
      <div className="flex flex-col h-full justify-between p-1">
        <div className="font-semibold truncate">{event.title}</div>
        <div className="flex items-center gap-1 text-xs">
          <span className={`${capacityColor} text-white px-1.5 py-0.5 rounded`}>
            {event.currentEnrollment}/{event.maxStudents}
          </span>
          {event.hasConflict && <span className="text-red-200">⚠️</span>}
        </div>
      </div>
    );
  };

  const handleRangeChange = (
    range: Date[] | { start: Date; end: Date },
    view?: View
  ) => {
    let start: Date;
    let end: Date;

    if (Array.isArray(range)) {
      start = range[0];
      end = range[range.length - 1];
    } else {
      start = range.start;
      end = range.end;
    }

    // Extend end date to end of day
    end = new Date(end);
    end.setHours(23, 59, 59, 999);

    // For Agenda view, ensure we show at least a week of data
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff < 7) {
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    }

    onDateRangeChange(start, end);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm p-4"
      style={{ height: "calc(100vh - 200px)" }}
    >
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectEvent={onEventClick}
        onRangeChange={handleRangeChange}
        view={view}
        onView={onViewChange}
        date={date}
        onNavigate={onDateChange}
        eventPropGetter={eventStyleGetter}
        // Temporarily disable custom component to debug
        // components={{
        //   event: EventComponent,
        // }}
        popup
        style={{ height: "100%" }}
      />
    </div>
  );
}
