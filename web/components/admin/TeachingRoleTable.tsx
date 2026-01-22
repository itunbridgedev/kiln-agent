"use client";

import { useState } from "react";
import StaffListModal from "./StaffListModal";

export interface TeachingRole {
  id: number;
  name: string;
  description: string | null;
  _count?: {
    staffRoles: number;
    classes: number;
  };
}

interface StaffMember {
  id: number;
  customerId: number;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  certifiedAt: string | null;
  notes: string | null;
}

interface TeachingRoleTableProps {
  roles: TeachingRole[];
  onEdit: (role: TeachingRole) => void;
  onDelete: (id: number) => void;
  onViewStaff: (role: TeachingRole) => void;
}

export default function TeachingRoleTable({
  roles,
  onEdit,
  onDelete,
  onViewStaff,
}: TeachingRoleTableProps) {
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TeachingRole | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const handleViewStaff = async (role: TeachingRole) => {
    setSelectedRole(role);
    setLoadingStaff(true);
    setShowStaffModal(true);

    try {
      const response = await fetch(`/api/admin/teaching-roles/${role.id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStaffMembers(data.staffRoles || []);
      } else {
        console.error("Failed to fetch staff members");
        setStaffMembers([]);
      }
    } catch (error) {
      console.error("Error fetching staff members:", error);
      setStaffMembers([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  if (roles.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="text-gray-400 text-5xl mb-4">🎓</div>
        <p className="text-gray-500">No teaching roles yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Create roles like "Basic Teacher" or "Glazing Specialist"
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Staff
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Classes
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {roles.map((role) => (
            <tr
              key={role.id}
              onClick={() => onEdit(role)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {role.name}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-500 max-w-md">
                  {role.description || (
                    <span className="text-gray-400 italic">No description</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStaff(role);
                  }}
                  className="text-sm text-primary hover:text-primary/80 font-medium underline"
                >
                  {role._count?.staffRoles || 0} staff
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {role._count?.classes || 0} classes
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (role._count?.classes && role._count.classes > 0) {
                      alert(
                        `Cannot delete this role. It is assigned to ${role._count.classes} class(es).`
                      );
                      return;
                    }
                    if (
                      confirm(
                        `Are you sure you want to delete the role "${role.name}"?`
                      )
                    ) {
                      onDelete(role.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-900 p-1"
                  title="Delete role"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Staff List Modal */}
      <StaffListModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        roleName={selectedRole?.name || ""}
        staffMembers={loadingStaff ? [] : staffMembers}
      />
    </div>
  );
}
