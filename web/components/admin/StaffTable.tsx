interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  systemRoles: string[];
  teachingRoles: Array<{
    id: number;
    name: string;
    certifiedAt?: string;
  }>;
}

interface StaffTableProps {
  staff: StaffMember[];
  onEdit: (staff: StaffMember) => void;
  onManageRoles: (staff: StaffMember) => void;
  onDeactivate: (staffId: number) => void;
}

export default function StaffTable({
  staff,
  onEdit,
  onManageRoles,
  onDeactivate,
}: StaffTableProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "staff":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              System Roles
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Teaching Roles
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {staff.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                No staff members found. Add your first staff member to get
                started.
              </td>
            </tr>
          ) : (
            staff.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {member.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{member.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {member.phone || "—"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {member.systemRoles.length === 0 ? (
                      <span className="text-sm text-gray-400">None</span>
                    ) : (
                      member.systemRoles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(role)}`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {member.teachingRoles.length === 0 ? (
                      <span className="text-gray-400">None</span>
                    ) : (
                      <span className="font-medium">
                        {member.teachingRoles.length} role
                        {member.teachingRoles.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(member)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit staff member"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onManageRoles(member)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Manage roles"
                    >
                      Roles
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to deactivate ${member.name}? This will remove all their roles.`
                          )
                        ) {
                          onDeactivate(member.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Deactivate staff member"
                    >
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
