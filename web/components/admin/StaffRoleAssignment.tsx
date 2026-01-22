import { useEffect, useState } from "react";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  systemRoles: string[];
  teachingRoles: Array<{
    id: number;
    name: string;
    certifiedAt?: string;
  }>;
}

interface TeachingRole {
  id: number;
  name: string;
  description?: string | null;
}

interface StaffRoleAssignmentProps {
  staff: StaffMember;
  availableTeachingRoles: TeachingRole[];
  onClose: () => void;
  onSave: (staffId: number, updates: RoleUpdates) => Promise<void>;
}

interface RoleUpdates {
  systemRolesToAdd: string[];
  systemRolesToRemove: string[];
  teachingRolesToAdd: Array<{ roleId: number; certifiedAt?: string }>;
  teachingRolesToRemove: number[];
}

export default function StaffRoleAssignment({
  staff,
  availableTeachingRoles,
  onClose,
  onSave,
}: StaffRoleAssignmentProps) {
  const [systemRoles, setSystemRoles] = useState<string[]>(
    staff.systemRoles || []
  );
  const [teachingRoles, setTeachingRoles] = useState<
    Map<number, { assigned: boolean; certifiedAt?: string }>
  >(new Map());
  const [saving, setSaving] = useState(false);

  const availableSystemRoles = ["admin", "manager", "staff"];

  useEffect(() => {
    // Initialize teaching roles state
    const roleMap = new Map<
      number,
      { assigned: boolean; certifiedAt?: string }
    >();

    availableTeachingRoles.forEach((role) => {
      const assigned = staff.teachingRoles.find((tr) => tr.id === role.id);
      roleMap.set(role.id, {
        assigned: !!assigned,
        certifiedAt: assigned?.certifiedAt,
      });
    });

    setTeachingRoles(roleMap);
  }, [staff, availableTeachingRoles]);

  const handleSystemRoleToggle = (role: string) => {
    setSystemRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleTeachingRoleToggle = (roleId: number) => {
    setTeachingRoles((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(roleId);
      newMap.set(roleId, {
        assigned: !current?.assigned,
        certifiedAt: current?.certifiedAt,
      });
      return newMap;
    });
  };

  const handleCertificationDateChange = (roleId: number, date: string) => {
    setTeachingRoles((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(roleId);
      newMap.set(roleId, {
        assigned: current?.assigned || false,
        certifiedAt: date || undefined,
      });
      return newMap;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calculate changes
      const originalSystemRoles = staff.systemRoles || [];
      const systemRolesToAdd = systemRoles.filter(
        (r) => !originalSystemRoles.includes(r)
      );
      const systemRolesToRemove = originalSystemRoles.filter(
        (r) => !systemRoles.includes(r)
      );

      const originalTeachingRoleIds = staff.teachingRoles.map((tr) => tr.id);
      const teachingRolesToAdd: Array<{
        roleId: number;
        certifiedAt?: string;
      }> = [];
      const teachingRolesToRemove: number[] = [];

      teachingRoles.forEach((value, roleId) => {
        const wasAssigned = originalTeachingRoleIds.includes(roleId);
        if (value.assigned && !wasAssigned) {
          teachingRolesToAdd.push({
            roleId,
            certifiedAt: value.certifiedAt,
          });
        } else if (!value.assigned && wasAssigned) {
          teachingRolesToRemove.push(roleId);
        }
      });

      await onSave(staff.id, {
        systemRolesToAdd,
        systemRolesToRemove,
        teachingRolesToAdd,
        teachingRolesToRemove,
      });

      onClose();
    } catch (error) {
      console.error("Error saving role assignments:", error);
      alert("Failed to save role assignments. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Manage Roles for {staff.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{staff.email}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* System Roles */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              System Roles
            </h3>
            <div className="space-y-2">
              {availableSystemRoles.map((role) => (
                <label
                  key={role}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={systemRoles.includes(role)}
                    onChange={() => handleSystemRoleToggle(role)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 capitalize">
                      {role}
                    </div>
                    <div className="text-xs text-gray-500">
                      {role === "admin" &&
                        "Full access to all studio settings and data"}
                      {role === "manager" &&
                        "Can manage classes, staff, and customers"}
                      {role === "staff" &&
                        "Can teach classes and take attendance"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Teaching Roles */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Teaching Roles
            </h3>
            {availableTeachingRoles.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No teaching roles available. Create teaching roles first.
              </p>
            ) : (
              <div className="space-y-3">
                {availableTeachingRoles.map((role) => {
                  const roleState = teachingRoles.get(role.id);
                  return (
                    <div
                      key={role.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleState?.assigned || false}
                          onChange={() => handleTeachingRoleToggle(role.id)}
                          className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {role.name}
                          </div>
                          {role.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {role.description}
                            </div>
                          )}
                          {roleState?.assigned && (
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Certification Date (Optional)
                              </label>
                              <input
                                type="date"
                                value={
                                  roleState.certifiedAt
                                    ? new Date(roleState.certifiedAt)
                                        .toISOString()
                                        .split("T")[0]
                                    : ""
                                }
                                onChange={(e) =>
                                  handleCertificationDateChange(
                                    role.id,
                                    e.target.value
                                  )
                                }
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
