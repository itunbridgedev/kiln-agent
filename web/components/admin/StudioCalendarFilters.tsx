import { useEffect, useState } from "react";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  roles: Array<{
    role: {
      id: number;
      name: string;
    };
  }>;
  staffTeachingRoles: Array<{
    role: {
      id: number;
      name: string;
    };
  }>;
}

interface Category {
  id: number;
  name: string;
}

interface StudioCalendarFiltersProps {
  categories: Category[];
  onFilterChange: (filters: {
    staffId: number | null;
    categoryId: number | null;
    roleType: "instructor" | "assistant" | null;
    enrollmentStatus: "full" | "available" | "low" | null;
  }) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function StudioCalendarFilters({
  categories,
  onFilterChange,
}: StudioCalendarFiltersProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [selectedRoleType, setSelectedRoleType] = useState<
    "instructor" | "assistant" | null
  >(null);
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState<
    "full" | "available" | "low" | null
  >(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    onFilterChange({
      staffId: selectedStaffId,
      categoryId: selectedCategoryId,
      roleType: selectedRoleType,
      enrollmentStatus: selectedEnrollmentStatus,
    });
  }, [
    selectedStaffId,
    selectedCategoryId,
    selectedRoleType,
    selectedEnrollmentStatus,
    onFilterChange,
  ]);

  const fetchStaff = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/calendar/staff`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const clearFilters = () => {
    setSelectedStaffId(null);
    setSelectedCategoryId(null);
    setSelectedRoleType(null);
    setSelectedEnrollmentStatus(null);
  };

  const activeFilterCount = [
    selectedStaffId,
    selectedCategoryId,
    selectedRoleType,
    selectedEnrollmentStatus,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isExpanded ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Staff Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff Member
              </label>
              <select
                value={selectedStaffId || ""}
                onChange={(e) =>
                  setSelectedStaffId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Staff</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategoryId || ""}
                onChange={(e) =>
                  setSelectedCategoryId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Type
              </label>
              <select
                value={selectedRoleType || ""}
                onChange={(e) =>
                  setSelectedRoleType(
                    (e.target.value as "instructor" | "assistant" | null) ||
                      null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Roles</option>
                <option value="instructor">Instructor</option>
                <option value="assistant">Assistant</option>
              </select>
            </div>

            {/* Enrollment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment
              </label>
              <select
                value={selectedEnrollmentStatus || ""}
                onChange={(e) =>
                  setSelectedEnrollmentStatus(
                    (e.target.value as "full" | "available" | "low" | null) ||
                      null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Sessions</option>
                <option value="full">Full (100%)</option>
                <option value="low">Low Enrollment (&lt;50%)</option>
                <option value="available">Available (&lt;100%)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
