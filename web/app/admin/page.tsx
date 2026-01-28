"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import CategoryForm, {
  CategoryFormData,
} from "@/components/admin/CategoryForm";
import CategoryTable from "@/components/admin/CategoryTable";
import ClassForm, { ClassFormData } from "@/components/admin/ClassForm";
import ClassTable from "@/components/admin/ClassTable";
import SchedulePatternManager from "@/components/admin/SchedulePatternManager";
import StaffRoleAssignment from "@/components/admin/StaffRoleAssignment";
import StudioCalendar, {
  StudioCalendarEvent,
} from "@/components/admin/StudioCalendar";
import StudioCalendarFilters from "@/components/admin/StudioCalendarFilters";
import StudioSessionDetailsModal from "@/components/admin/StudioSessionDetailsModal";
import TeachingRoleForm, {
  TeachingRoleFormData,
} from "@/components/admin/TeachingRoleForm";
import TeachingRoleTable, {
  TeachingRole,
} from "@/components/admin/TeachingRoleTable";
import UserRoleEditor from "@/components/admin/UserRoleEditor";
import UserSearch from "@/components/admin/UserSearch";
import CalendarSubscription from "@/components/staff/CalendarSubscription";
import SessionDetailsModal from "@/components/staff/SessionDetailsModal";
import StaffCalendar, { CalendarEvent } from "@/components/staff/StaffCalendar";
import { useAuth } from "@/context/AuthContext";
import { startOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-big-calendar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Category {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isSystemCategory: boolean;
  featureModule: string | null;
  parentCategoryId: number | null;
  _count?: {
    products: number;
  };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Initialize activeTab from localStorage or default to "schedule"
  const [activeTab, setActiveTab] = useState<
    | "schedule"
    | "studio-calendar"
    | "categories"
    | "classes"
    | "teaching-roles"
    | "users"
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adminActiveTab");
      if (
        saved &&
        [
          "schedule",
          "studio-calendar",
          "categories",
          "classes",
          "teaching-roles",
          "users",
        ].includes(saved)
      ) {
        return saved as
          | "schedule"
          | "studio-calendar"
          | "categories"
          | "classes"
          | "teaching-roles"
          | "users";
      }
    }
    return "schedule";
  });
  const [classesExpanded, setClassesExpanded] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studioName, setStudioName] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [classesSystemCategoryId, setClassesSystemCategoryId] = useState<
    number | null
  >(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachingRoles, setTeachingRoles] = useState<TeachingRole[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Class form state
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [selectedTeachingRoleFilters, setSelectedTeachingRoleFilters] =
    useState<number[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Teaching role form state
  const [showTeachingRoleForm, setShowTeachingRoleForm] = useState(false);
  const [editingTeachingRole, setEditingTeachingRole] =
    useState<TeachingRole | null>(null);

  // User management state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserRoleEditor, setShowUserRoleEditor] = useState(false);
  const [roleAssignmentStaff, setRoleAssignmentStaff] = useState<any>(null);

  // Schedule pattern management state
  const [scheduleManagementClass, setScheduleManagementClass] = useState<any>(null);
  const [showScheduleManager, setShowScheduleManager] = useState(false);

  // Schedule state
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<View>("week");
  const [scheduleDate, setScheduleDate] = useState(new Date());

  const getInitialDateRange = () => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return { start: weekStart, end: weekEnd };
  };

  const [scheduleDateRange, setScheduleDateRange] = useState(
    getInitialDateRange()
  );

  // Studio Calendar state
  const [studioEvents, setStudioEvents] = useState<StudioCalendarEvent[]>([]);
  const [selectedStudioEvent, setSelectedStudioEvent] =
    useState<StudioCalendarEvent | null>(null);
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioView, setStudioView] = useState<View>("week");
  const [studioDate, setStudioDate] = useState(new Date());
  const [studioDateRange, setStudioDateRange] = useState(getInitialDateRange());
  const [studioFilters, setStudioFilters] = useState<{
    staffId: number | null;
    categoryId: number | null;
    roleType: "instructor" | "assistant" | null;
    enrollmentStatus: "full" | "available" | "low" | null;
  }>({
    staffId: null,
    categoryId: null,
    roleType: null,
    enrollmentStatus: null,
  });

  // Ref for filter dropdown click-outside
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchStudioInfo();
      fetchCategories();
      fetchClasses();
      fetchTeachingRoles();
    }
  }, [user]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  const fetchStudioInfo = async () => {
    try {
      const response = await fetch("/api/studio", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStudioName(data.name);
      }
    } catch (error) {
      console.error("Error fetching studio info:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        // Find the Classes system category
        const classesCategory = data.find(
          (cat: Category) => cat.isSystemCategory && cat.name === "Classes"
        );
        if (classesCategory) {
          setClassesSystemCategoryId(classesCategory.id);
          // Only show subcategories of Classes
          const classSubcategories = data.filter(
            (cat: Category) => cat.parentCategoryId === classesCategory.id
          );
          setCategories(classSubcategories);
        } else {
          setCategories([]);
        }
      } else {
        setError("Failed to load categories");
      }
    } catch (err) {
      setError("Error loading categories");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/admin/classes", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (err) {
      console.error("Error loading classes:", err);
    }
  };

  const handleCategorySubmit = async (formData: CategoryFormData) => {
    setError("");

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCategories();
        resetCategoryForm();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save category");
      }
    } catch (err) {
      setError("Error saving category");
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete category");
      }
    } catch (err) {
      setError("Error deleting category");
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleCategoryReorder = async (reorderedCategories: Category[]) => {
    try {
      // Update each category's displayOrder
      const updates = reorderedCategories.map((cat) =>
        fetch(`/api/admin/categories/${cat.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: cat.name,
            description: cat.description || "",
            displayOrder: cat.displayOrder,
            isActive: cat.isActive,
            parentCategoryId: cat.parentCategoryId,
          }),
        })
      );

      await Promise.all(updates);
      await fetchCategories();
    } catch (err) {
      setError("Error reordering categories");
    }
  };

  const resetClassForm = () => {
    setEditingClass(null);
    setShowClassForm(false);
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const editClass = (classData: any) => {
    setEditingClass(classData);
    setShowClassForm(true);
  };

  const handleClassSubmit = async (formData: ClassFormData) => {
    setError("");

    try {
      const url = editingClass
        ? `/api/admin/classes/${editingClass.id}`
        : "/api/admin/classes";

      const response = await fetch(url, {
        method: editingClass ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchClasses();
        resetClassForm();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save class");
      }
    } catch (err) {
      setError("Error saving class");
    }
  };

  const deleteClass = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/classes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchClasses();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete class");
      }
    } catch (err) {
      setError("Error deleting class");
    }
  };

  const manageClassSchedule = (classData: any) => {
    setScheduleManagementClass(classData);
    setShowScheduleManager(true);
  };

  const handleScheduleSuccess = () => {
    setShowScheduleManager(false);
    setScheduleManagementClass(null);
    fetchClasses(); // Refresh class list
  };

  // Teaching Roles functions
  const fetchTeachingRoles = async () => {
    try {
      const response = await fetch("/api/admin/teaching-roles", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTeachingRoles(data);
      }
    } catch (err) {
      console.error("Error loading teaching roles:", err);
    }
  };

  // Fetch schedule sessions
  const fetchSessions = useCallback(async (start: Date, end: Date) => {
    setScheduleLoading(true);
    setScheduleError(null);

    try {
      const startParam = start.toISOString().split("T")[0];
      const endParam = end.toISOString().split("T")[0];

      const response = await fetch(
        `${API_BASE_URL}/api/staff/my-sessions?startDate=${startParam}&endDate=${endParam}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to view your schedule");
        }
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      setScheduleEvents(data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setScheduleError(
        err instanceof Error ? err.message : "Failed to load sessions"
      );
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  // Schedule handlers
  const handleScheduleDateRangeChange = useCallback(
    (start: Date, end: Date) => {
      setScheduleDateRange({ start, end });
      fetchSessions(start, end);
    },
    [fetchSessions]
  );

  const handleScheduleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  // Studio Calendar handlers
  const fetchStudioSessions = useCallback(
    async (start: Date, end: Date) => {
      setStudioLoading(true);
      setStudioError(null);

      try {
        const startParam = start.toISOString().split("T")[0];
        const endParam = end.toISOString().split("T")[0];

        const params = new URLSearchParams({
          startDate: startParam,
          endDate: endParam,
        });

        if (studioFilters.staffId) {
          params.append("staffId", studioFilters.staffId.toString());
        }
        if (studioFilters.categoryId) {
          params.append("categoryId", studioFilters.categoryId.toString());
        }
        if (studioFilters.roleType) {
          params.append("roleType", studioFilters.roleType);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/admin/calendar/sessions?${params}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch studio sessions");
        }

        let data: StudioCalendarEvent[] = await response.json();

        // Convert string dates to Date objects
        // Parse ISO strings as local time (not UTC)
        data = data.map((event) => {
          const parseLocalDateTime = (dateTimeStr: string): Date => {
            const [datePart, timePart] = dateTimeStr.split("T");
            const [year, month, day] = datePart.split("-").map(Number);
            const [hour, minute] = timePart.split(":").map(Number);
            return new Date(year, month - 1, day, hour, minute);
          };

          return {
            ...event,
            start: parseLocalDateTime(event.start as unknown as string),
            end: parseLocalDateTime(event.end as unknown as string),
          };
        });

        // Apply enrollment filter client-side
        if (studioFilters.enrollmentStatus) {
          data = data.filter((event) => {
            const percent = (event.currentEnrollment / event.maxStudents) * 100;
            if (studioFilters.enrollmentStatus === "full") {
              return percent >= 100;
            } else if (studioFilters.enrollmentStatus === "low") {
              return percent < 50;
            } else if (studioFilters.enrollmentStatus === "available") {
              return percent < 100;
            }
            return true;
          });
        }

        // Detect conflicts (same staff in overlapping sessions)
        const eventsWithConflicts = data.map((event) => {
          const hasConflict = data.some((other) => {
            if (other.id === event.id) return false;
            const eventStart = new Date(event.start).getTime();
            const eventEnd = new Date(event.end).getTime();
            const otherStart = new Date(other.start).getTime();
            const otherEnd = new Date(other.end).getTime();

            // Check for time overlap
            const overlaps =
              (eventStart < otherEnd && eventEnd > otherStart) ||
              (otherStart < eventEnd && otherEnd > eventStart);

            if (!overlaps) return false;

            // Check for shared staff
            return event.staff.some((staff) =>
              other.staff.some((otherStaff) => otherStaff.id === staff.id)
            );
          });

          return { ...event, hasConflict };
        });

        setStudioEvents(eventsWithConflicts);
      } catch (err) {
        console.error("Error fetching studio sessions:", err);
        setStudioError(
          err instanceof Error ? err.message : "Failed to load sessions"
        );
      } finally {
        setStudioLoading(false);
      }
    },
    [studioFilters]
  );

  const handleStudioDateRangeChange = useCallback(
    (start: Date, end: Date) => {
      setStudioDateRange({ start, end });
      fetchStudioSessions(start, end);
    },
    [fetchStudioSessions]
  );

  const handleStudioEventClick = useCallback((event: StudioCalendarEvent) => {
    setSelectedStudioEvent(event);
  }, []);

  const handleCloseStudioModal = useCallback(() => {
    setSelectedStudioEvent(null);
  }, []);

  const handleStudioStaffChange = useCallback(() => {
    // Refresh studio calendar events with current date range
    fetchStudioSessions(studioDateRange.start, studioDateRange.end);
  }, [studioDateRange, fetchStudioSessions]);

  const handleStudioFiltersChange = useCallback(
    (filters: typeof studioFilters) => {
      setStudioFilters(filters);
    },
    []
  );

  // Load schedule on initial mount and tab change
  useEffect(() => {
    if (activeTab === "schedule" && user) {
      fetchSessions(scheduleDateRange.start, scheduleDateRange.end);
    }
  }, [
    activeTab,
    user,
    fetchSessions,
    scheduleDateRange.start,
    scheduleDateRange.end,
  ]);

  // Load studio calendar when tab is active or filters change
  useEffect(() => {
    if (activeTab === "studio-calendar" && user) {
      fetchStudioSessions(studioDateRange.start, studioDateRange.end);
    }
  }, [
    activeTab,
    user,
    studioFilters,
    fetchStudioSessions,
    studioDateRange.start,
    studioDateRange.end,
  ]);

  const handleTeachingRoleSubmit = async (formData: TeachingRoleFormData) => {
    setError("");

    try {
      const url = editingTeachingRole
        ? `/api/admin/teaching-roles/${editingTeachingRole.id}`
        : "/api/admin/teaching-roles";

      const response = await fetch(url, {
        method: editingTeachingRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTeachingRoles();
        resetTeachingRoleForm();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save teaching role");
      }
    } catch (err) {
      setError("Error saving teaching role");
    }
  };

  const deleteTeachingRole = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/teaching-roles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchTeachingRoles();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete teaching role");
      }
    } catch (err) {
      setError("Error deleting teaching role");
    }
  };

  const resetTeachingRoleForm = () => {
    setEditingTeachingRole(null);
    setShowTeachingRoleForm(false);
  };

  const editTeachingRole = (role: TeachingRole) => {
    setEditingTeachingRole(role);
    setShowTeachingRoleForm(true);
  };

  const viewStaffForRole = (role: TeachingRole) => {
    // TODO: Implement staff assignment modal
    alert(`View staff for ${role.name} - Coming in next phase!`);
  };

  // User management functions
  const handleUserSelect = async (user: {
    id: number;
    name: string;
    email: string;
    systemRoles: string[];
    teachingRoles: any[];
  }) => {
    setSelectedUser(user);
  };

  const handleUserRoleSave = async (userId: number, roles: string[]) => {
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roles }),
      });

      if (response.ok) {
        // Refresh selected user data
        const userResponse = await fetch(`/api/admin/users/${userId}`, {
          credentials: "include",
        });
        if (userResponse.ok) {
          const updatedUser = await userResponse.json();
          setSelectedUser(updatedUser);
        }
        setShowUserRoleEditor(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update user roles");
      }
    } catch (err) {
      setError("Error updating user roles");
    }
  };

  const handleRoleAssignmentSave = async (
    staffId: number,
    updates: {
      systemRolesToAdd: string[];
      systemRolesToRemove: string[];
      teachingRolesToAdd: Array<{ roleId: number; certifiedAt?: string }>;
      teachingRolesToRemove: number[];
    }
  ) => {
    try {
      // Handle system roles update (if there are changes)
      if (
        updates.systemRolesToAdd.length > 0 ||
        updates.systemRolesToRemove.length > 0
      ) {
        // Get current user data
        const response = await fetch(`/api/admin/users/${staffId}`, {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          let currentRoles = userData.systemRoles || [];

          // Add new roles
          currentRoles = [...currentRoles, ...updates.systemRolesToAdd];

          // Remove roles
          currentRoles = currentRoles.filter(
            (role: string) => !updates.systemRolesToRemove.includes(role)
          );

          // Remove duplicates
          currentRoles = [...new Set(currentRoles)];

          // Update roles via API
          await fetch(`/api/admin/users/${staffId}/roles`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ roles: currentRoles }),
          });
        }
      }

      // Add teaching roles
      for (const { roleId, certifiedAt } of updates.teachingRolesToAdd) {
        await fetch(`/api/admin/teaching-roles/staff/${staffId}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ roleId, certifiedAt }),
        });
      }

      // Remove teaching roles
      for (const roleId of updates.teachingRolesToRemove) {
        await fetch(
          `/api/admin/teaching-roles/staff/${staffId}/roles/${roleId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );
      }

      // Refresh selected user data if we have one selected
      if (selectedUser && selectedUser.id === staffId) {
        const userResponse = await fetch(`/api/admin/users/${staffId}`, {
          credentials: "include",
        });
        if (userResponse.ok) {
          const updatedUser = await userResponse.json();
          setSelectedUser(updatedUser);
        }
      }

      // Refresh teaching roles list to update counts
      await fetchTeachingRoles();
    } catch (error) {
      console.error("Error updating role assignments:", error);
      setError("Failed to update role assignments");
    }
  };

  const openRoleAssignment = (user: {
    id: number;
    name: string;
    email: string;
    systemRoles: string[];
    teachingRoles: any[];
  }) => {
    setRoleAssignmentStaff(user);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">
          {activeTab === "schedule" && "My Schedule"}
          {activeTab === "studio-calendar" && "Studio Calendar"}
          {activeTab === "categories" && "Categories"}
          {activeTab === "classes" && "Classes"}
          {activeTab === "teaching-roles" && "Teaching Roles"}
          {activeTab === "users" && "Users"}
        </h1>
      </div>

      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        classesExpanded={classesExpanded}
        scheduleExpanded={scheduleExpanded}
        studioName={studioName}
        user={user!}
        isOpen={mobileMenuOpen}
        onTabChange={(tab) => {
          setActiveTab(tab);
          localStorage.setItem("adminActiveTab", tab);
          setError(""); // Clear any previous errors when switching tabs
          // Expand Schedule module for schedule and studio-calendar tabs
          if (tab === "schedule" || tab === "studio-calendar") {
            setScheduleExpanded(true);
            setClassesExpanded(false);
          }
          // Expand Classes module only for categories, classes, and teaching-roles
          else if (
            tab === "categories" ||
            tab === "classes" ||
            tab === "teaching-roles"
          ) {
            setClassesExpanded(true);
            setScheduleExpanded(false);
          } else {
            // Collapse both for users tab
            setClassesExpanded(false);
            setScheduleExpanded(false);
          }
        }}
        onToggleClassesExpanded={() => setClassesExpanded(!classesExpanded)}
        onToggleScheduleExpanded={() => setScheduleExpanded(!scheduleExpanded)}
        onBackHome={() => router.push("/")}
        onLogout={async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          router.push("/login");
        }}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {activeTab === "schedule"
                ? "My Schedule"
                : activeTab === "categories"
                  ? "Class Categories"
                  : activeTab === "classes"
                    ? "Classes"
                    : activeTab === "teaching-roles"
                      ? "Teaching Roles"
                      : "User Management"}
            </h1>
            <p className="text-gray-600 mb-4">
              {activeTab === "schedule"
                ? "View and manage your teaching sessions"
                : activeTab === "categories"
                  ? "Manage your class categories and subcategories"
                  : activeTab === "classes"
                    ? "Manage your class offerings"
                    : activeTab === "teaching-roles"
                      ? "Manage teaching roles and staff assignments"
                      : "Search for users and manage their roles"}
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white text-primary border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Back to Home
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error text-error rounded-md">
              {error}
            </div>
          )}

          {activeTab === "schedule" && (
            <div>
              {scheduleError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-600 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-red-800">{scheduleError}</span>
                  </div>
                </div>
              )}

              {scheduleLoading && (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              )}

              {!scheduleLoading && !scheduleError && (
                <>
                  {scheduleEvents.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No sessions found
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        You don't have any teaching sessions scheduled for this
                        time period.
                      </p>
                    </div>
                  ) : (
                    <StaffCalendar
                      events={scheduleEvents}
                      onEventClick={handleScheduleEventClick}
                      onDateRangeChange={handleScheduleDateRangeChange}
                      view={scheduleView}
                      onViewChange={setScheduleView}
                      date={scheduleDate}
                      onDateChange={setScheduleDate}
                    />
                  )}
                </>
              )}

              <SessionDetailsModal
                event={selectedEvent}
                onClose={handleCloseModal}
              />

              {/* Calendar Subscription Section */}
              {!scheduleLoading && !scheduleError && (
                <div className="mt-8">
                  <CalendarSubscription />
                </div>
              )}
            </div>
          )}

          {activeTab === "studio-calendar" && (
            <div>
              <StudioCalendarFilters
                categories={categories}
                onFilterChange={handleStudioFiltersChange}
              />

              {studioError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-600 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-red-800">{studioError}</span>
                  </div>
                </div>
              )}

              {studioLoading && (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              )}

              {!studioLoading && !studioError && (
                <>
                  {studioEvents.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No sessions found
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        No studio sessions match the selected filters for this
                        time period.
                      </p>
                    </div>
                  ) : (
                    <StudioCalendar
                      events={studioEvents}
                      onEventClick={handleStudioEventClick}
                      onDateRangeChange={handleStudioDateRangeChange}
                      view={studioView}
                      onViewChange={setStudioView}
                      date={studioDate}
                      onDateChange={setStudioDate}
                    />
                  )}
                </>
              )}

              <StudioSessionDetailsModal
                event={selectedStudioEvent}
                onClose={handleCloseStudioModal}
                onStaffChange={handleStudioStaffChange}
              />
            </div>
          )}

          {activeTab === "categories" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Class Categories
                </h2>
                <button
                  className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                >
                  {showCategoryForm ? "Cancel" : "+ Add Category"}
                </button>
              </div>

              {showCategoryForm && (
                <div className="mb-6">
                  <CategoryForm
                    editingCategory={editingCategory}
                    categories={categories}
                    classesSystemCategoryId={classesSystemCategoryId}
                    onSubmit={handleCategorySubmit}
                    onCancel={resetCategoryForm}
                  />
                </div>
              )}

              <CategoryTable
                categories={categories}
                loading={loadingData}
                onEdit={editCategory}
                onDelete={deleteCategory}
                onReorder={handleCategoryReorder}
              />
            </div>
          )}

          {activeTab === "classes" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Classes
                </h2>
                <button
                  className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
                  onClick={() => setShowClassForm(!showClassForm)}
                >
                  {showClassForm ? "Cancel" : "+ Add Class"}
                </button>
              </div>

              {/* Teaching Role Filter */}
              {!showClassForm && (
                <div className="mb-6 relative" ref={filterDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Teaching Role
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="w-full md:w-80 px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {selectedTeachingRoleFilters.length === 0
                        ? "All Teaching Roles"
                        : `${selectedTeachingRoleFilters.length} role(s) selected`}
                      <span className="float-right">▼</span>
                    </button>
                    {showFilterDropdown && (
                      <div className="absolute z-10 mt-1 w-full md:w-80 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div className="p-2">
                          <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded">
                            <input
                              type="checkbox"
                              checked={selectedTeachingRoleFilters.length === 0}
                              onChange={() =>
                                setSelectedTeachingRoleFilters([])
                              }
                              className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              All Teaching Roles
                            </span>
                          </label>
                          {teachingRoles.map((role) => (
                            <label
                              key={role.id}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTeachingRoleFilters.includes(
                                  role.id
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTeachingRoleFilters([
                                      ...selectedTeachingRoleFilters,
                                      role.id,
                                    ]);
                                  } else {
                                    setSelectedTeachingRoleFilters(
                                      selectedTeachingRoleFilters.filter(
                                        (id) => id !== role.id
                                      )
                                    );
                                  }
                                }}
                                className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">
                                {role.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedTeachingRoleFilters.length > 0 && (
                    <button
                      onClick={() => setSelectedTeachingRoleFilters([])}
                      className="mt-2 text-sm text-primary hover:text-primary-dark"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {showClassForm && (
                <div className="mb-6">
                  <ClassForm
                    initialData={editingClass}
                    onSubmit={handleClassSubmit}
                    onCancel={resetClassForm}
                    categories={categories}
                    teachingRoles={teachingRoles}
                  />
                </div>
              )}

              {!showClassForm && (
                <ClassTable
                  classes={
                    selectedTeachingRoleFilters.length === 0
                      ? classes
                      : classes.filter(
                          (cls: any) =>
                            cls.teachingRoleId &&
                            selectedTeachingRoleFilters.includes(
                              cls.teachingRoleId
                            )
                        )
                  }
                  onEdit={editClass}
                  onDelete={deleteClass}
                  onManageSchedule={manageClassSchedule}
                />
              )}
            </div>
          )}

          {activeTab === "teaching-roles" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Teaching Roles
                </h2>
                <button
                  className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
                  onClick={() => setShowTeachingRoleForm(!showTeachingRoleForm)}
                >
                  {showTeachingRoleForm ? "Cancel" : "+ Add Teaching Role"}
                </button>
              </div>

              {showTeachingRoleForm && (
                <div className="mb-6 bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {editingTeachingRole
                      ? "Edit Teaching Role"
                      : "Create Teaching Role"}
                  </h3>
                  <TeachingRoleForm
                    initialData={editingTeachingRole || undefined}
                    onSubmit={handleTeachingRoleSubmit}
                    onCancel={resetTeachingRoleForm}
                  />
                </div>
              )}

              {!showTeachingRoleForm && (
                <TeachingRoleTable
                  roles={teachingRoles}
                  onEdit={editTeachingRole}
                  onDelete={deleteTeachingRole}
                  onViewStaff={viewStaffForRole}
                />
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  User Management
                </h2>
                <p className="text-gray-600 mb-6">
                  Search for users and promote them to Staff, Manager, or Admin
                  roles. Users with staff-level roles can then be assigned
                  teaching roles.
                </p>
                <UserSearch onSelectUser={handleUserSelect} />
              </div>

              {selectedUser && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedUser.name}
                      </h3>
                      <p className="text-gray-600">{selectedUser.email}</p>
                      {selectedUser.phone && (
                        <p className="text-gray-600">{selectedUser.phone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      System Roles:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.systemRoles.length > 0 ? (
                        selectedUser.systemRoles.map((role: string) => (
                          <span
                            key={role}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              role === "admin"
                                ? "bg-red-100 text-red-800"
                                : role === "manager"
                                  ? "bg-blue-100 text-blue-800"
                                  : role === "staff"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">No roles assigned</span>
                      )}
                    </div>
                  </div>

                  {selectedUser.teachingRoles &&
                    selectedUser.teachingRoles.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Teaching Roles:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedUser.teachingRoles.map((role: any) => (
                            <span
                              key={role.id}
                              className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowUserRoleEditor(true)}
                      className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
                    >
                      Edit System Roles
                    </button>
                    {selectedUser.systemRoles.some((r: string) =>
                      ["admin", "manager", "staff"].includes(r)
                    ) && (
                      <button
                        onClick={() => openRoleAssignment(selectedUser)}
                        className="px-6 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors"
                      >
                        Manage Teaching Roles
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Role Editor Modal */}
          {showUserRoleEditor && selectedUser && (
            <UserRoleEditor
              user={selectedUser}
              currentUserRoles={user?.roles || []}
              onClose={() => setShowUserRoleEditor(false)}
              onSave={handleUserRoleSave}
            />
          )}

          {/* Teaching Role Assignment Modal */}
          {roleAssignmentStaff && (
            <StaffRoleAssignment
              staff={roleAssignmentStaff}
              availableTeachingRoles={teachingRoles as any}
              onClose={() => setRoleAssignmentStaff(null)}
              onSave={handleRoleAssignmentSave}
            />
          )}

          {/* Schedule Pattern Manager Modal */}
          {showScheduleManager && scheduleManagementClass && (
            <SchedulePatternManager
              classData={scheduleManagementClass}
              onClose={() => {
                setShowScheduleManager(false);
                setScheduleManagementClass(null);
              }}
              onSuccess={handleScheduleSuccess}
            />
          )}
        </div>
      </main>
    </div>
  );
}
