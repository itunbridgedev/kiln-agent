interface Class {
  id: number;
  name: string;
  description: string | null;
  classType: string;
  durationWeeks: number | null;
  durationHours: number | null;
  isRecurring: boolean;
  requiresSequence: boolean;
  maxStudents: number;
  price: string;
  skillLevel: string | null;
  isActive: boolean;
  teachingRole?: {
    id: number;
    name: string;
  } | null;
  product?: {
    id: number;
    name: string;
  } | null;
  schedules?: Array<{
    id: number;
    startDate: string;
    endDate: string | null;
    status: string;
    enrolledCount: number;
    _count: {
      sessions: number;
      enrollments: number;
    };
  }>;
  steps?: Array<{
    id: number;
    stepNumber: number;
    name: string;
    durationHours: string;
  }>;
  _count?: {
    schedules: number;
    sessions: number;
  };
}

interface ClassTableProps {
  classes: Class[];
  onEdit: (classData: Class) => void;
  onDelete: (id: number) => void;
  onManageSchedule: (classData: Class) => void;
}

export default function ClassTable({
  classes,
  onEdit,
  onDelete,
  onManageSchedule,
}: ClassTableProps) {
  const getClassTypeBadge = (classData: Class) => {
    const types: Record<string, { label: string; color: string }> = {
      "single-session": {
        label: "Single",
        color: "bg-purple-100 text-purple-800",
      },
      "multi-session": {
        label: "Multi-Session",
        color: "bg-blue-100 text-blue-800",
      },
      series: { label: "Series", color: "bg-green-100 text-green-800" },
      "multi-step": {
        label: "Multi-Step",
        color: "bg-orange-100 text-orange-800",
      },
    };

    const type = types[classData.classType] || {
      label: classData.classType,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${type.color}`}
      >
        {type.label}
      </span>
    );
  };

  const getDuration = (classData: Class) => {
    if (classData.classType === "single-session") {
      return `${classData.durationHours} hrs`;
    }
    if (classData.classType === "multi-session") {
      return `${classData.durationWeeks} weeks`;
    }
    if (classData.classType === "series") {
      return "Recurring";
    }
    if (classData.classType === "multi-step" && classData.steps) {
      return `${classData.steps.length} steps`;
    }
    return "—";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Class Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capacity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {classes.map((classData) => (
            <tr
              key={classData.id}
              onClick={() => onEdit(classData)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-900">
                    {classData.name}
                  </div>
                  {classData.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {classData.description.substring(0, 60)}
                      {classData.description.length > 60 && "..."}
                    </div>
                  )}
                  {classData.skillLevel && (
                    <div className="text-xs text-gray-500 mt-1">
                      Level: {classData.skillLevel}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getClassTypeBadge(classData)}
                {classData.isRecurring && (
                  <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ↻
                  </span>
                )}
                {classData.requiresSequence && (
                  <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    →
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {getDuration(classData)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {classData.teachingRole?.name || "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {classData.maxStudents}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${parseFloat(classData.price).toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    classData.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {classData.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageSchedule(classData);
                    }}
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="Manage schedule"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          `Are you sure you want to delete "${classData.name}"?`
                        )
                      ) {
                        onDelete(classData.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete class"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {classes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No classes yet. Create your first one!
        </div>
      )}
    </div>
  );
}
