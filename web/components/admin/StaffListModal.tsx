"use client";

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

interface StaffListModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleName: string;
  staffMembers: StaffMember[];
}

export default function StaffListModal({
  isOpen,
  onClose,
  roleName,
  staffMembers,
}: StaffListModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Staff Members - {roleName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {staffMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No staff members assigned to this role yet.
            </div>
          ) : (
            <div className="space-y-4">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {staff.customer.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {staff.customer.email}
                      </p>
                      {staff.certifiedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Certified: {formatDate(staff.certifiedAt)}
                        </p>
                      )}
                      {staff.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {staff.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {staffMembers.length} staff member
              {staffMembers.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
