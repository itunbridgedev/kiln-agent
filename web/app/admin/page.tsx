"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import CategoryForm, {
  CategoryFormData,
} from "@/components/admin/CategoryForm";
import CategoryTable from "@/components/admin/CategoryTable";
import ClassForm, { ClassFormData } from "@/components/admin/ClassForm";
import ClassTable from "@/components/admin/ClassTable";
import StaffRoleAssignment from "@/components/admin/StaffRoleAssignment";
import TeachingRoleForm, {
  TeachingRoleFormData,
} from "@/components/admin/TeachingRoleForm";
import TeachingRoleTable, {
  TeachingRole,
} from "@/components/admin/TeachingRoleTable";
import UserRoleEditor from "@/components/admin/UserRoleEditor";
import UserSearch from "@/components/admin/UserSearch";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [activeTab, setActiveTab] = useState<
    "categories" | "classes" | "teaching-roles" | "users"
  >("categories");
  const [classesExpanded, setClassesExpanded] = useState(true);
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
  const handleUserSelect = async (user: any) => {
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

  const openRoleAssignment = (user: any) => {
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
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        classesExpanded={classesExpanded}
        studioName={studioName}
        user={user!}
        onTabChange={(tab) => {
          setActiveTab(tab);
          // Expand Classes module for categories, classes, and teaching-roles
          if (
            tab === "categories" ||
            tab === "classes" ||
            tab === "teaching-roles"
          ) {
            setClassesExpanded(true);
          } else if (tab === "users") {
            // Collapse Classes module when Users tab is active
            setClassesExpanded(false);
          }
        }}
        onToggleClassesExpanded={() => setClassesExpanded(!classesExpanded)}
        onBackHome={() => router.push("/")}
        onLogout={async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          router.push("/login");
        }}
      />

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {activeTab === "categories"
                ? "Class Categories"
                : activeTab === "classes"
                  ? "Classes"
                  : activeTab === "teaching-roles"
                    ? "Teaching Roles"
                    : "User Management"}
            </h1>
            <p className="text-gray-600 mb-4">
              {activeTab === "categories"
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
                          (cls) =>
                            cls.teachingRoleId &&
                            selectedTeachingRoleFilters.includes(
                              cls.teachingRoleId
                            )
                        )
                  }
                  onEdit={editClass}
                  onDelete={deleteClass}
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
        </div>
      </main>
    </div>
  );
}
