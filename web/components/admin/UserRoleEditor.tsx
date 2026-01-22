import { useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  systemRoles: string[];
  teachingRoles?: Array<{ id: number; name: string }>;
}

interface UserRoleEditorProps {
  user: User;
  currentUserRoles: string[];
  onClose: () => void;
  onSave: (userId: number, roles: string[]) => Promise<void>;
}

export default function UserRoleEditor({
  user,
  currentUserRoles,
  onClose,
  onSave,
}: UserRoleEditorProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user.systemRoles.length > 0 ? user.systemRoles : ["user"]
  );
  const [saving, setSaving] = useState(false);

  // Determine what roles the current user can assign
  const isAdmin = currentUserRoles.includes("admin");
  const isManager = currentUserRoles.includes("manager");
  const isStaff = currentUserRoles.includes("staff");

  // Define which roles can be assigned by each user type
  const availableRoles = [
    {
      value: "user",
      label: "Customer",
      description: "Regular customer account",
      canAssign: isAdmin || isManager, // Admin and Manager can assign
    },
    {
      value: "staff",
      label: "Staff",
      description: "Can teach classes and take attendance",
      canAssign: isAdmin || isManager, // Admin and Manager can assign
    },
    {
      value: "manager",
      label: "Manager",
      description: "Can manage classes, staff, and customers",
      canAssign: isAdmin, // Only Admin can assign
    },
    {
      value: "admin",
      label: "Admin",
      description: "Full access to all studio settings",
      canAssign: isAdmin, // Only Admin can assign
    },
  ];

  const handleRoleToggle = (role: string) => {
    // Find the role config
    const roleConfig = availableRoles.find((r) => r.value === role);

    // Check if user can assign this role
    if (!roleConfig?.canAssign) {
      return; // Don't allow toggle
    }

    if (role === "user") {
      // If selecting "user", remove all other roles
      setSelectedRoles(["user"]);
    } else {
      // Remove "user" if selecting any staff role
      let newRoles = selectedRoles.filter((r) => r !== "user");
      if (newRoles.includes(role)) {
        newRoles = newRoles.filter((r) => r !== role);
        // If no roles left, default to "user"
        if (newRoles.length === 0) {
          newRoles = ["user"];
        }
      } else {
        newRoles.push(role);
      }
      setSelectedRoles(newRoles);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.id, selectedRoles);
      onClose();
    } catch (error) {
      console.error("Error saving roles:", error);
      alert("Failed to save roles. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Roles for {user.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-gray-600">
            Select the role(s) for this user. Users start as Customers and can
            be promoted to Staff, Manager, or Admin.
          </p>

          <div className="space-y-3">
            {availableRoles.map((role) => {
              const canModify = role.canAssign && !isStaff;
              const isDisabled = !canModify;

              return (
                <label
                  key={role.value}
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg transition-colors ${
                    selectedRoles.includes(role.value)
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => handleRoleToggle(role.value)}
                    disabled={isDisabled}
                    className="mt-1 h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">
                        {role.label}
                      </div>
                      {isDisabled && !role.canAssign && (
                        <span className="text-xs text-gray-500 italic">
                          (Requires{" "}
                          {role.value === "admin" || role.value === "manager"
                            ? "Admin"
                            : "Admin/Manager"}
                          )
                        </span>
                      )}
                      {isStaff && (
                        <span className="text-xs text-gray-500 italic">
                          (View only)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {role.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {selectedRoles.some((r) =>
            ["admin", "manager", "staff"].includes(r)
          ) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-blue-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-blue-700">
                  <strong>Staff Access:</strong> Users with Staff, Manager, or
                  Admin roles can be assigned to Teaching Roles.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {!isStaff && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Roles"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
