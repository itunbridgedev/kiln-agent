import { useState, useEffect } from "react";

interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  systemRoles: string[];
}

interface StaffFormProps {
  initialData?: {
    id?: number;
    name: string;
    email: string;
    phone?: string;
    systemRoles: string[];
  };
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
}

export default function StaffForm({
  initialData,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  const [formData, setFormData] = useState<StaffFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    password: "",
    systemRoles: initialData?.systemRoles || [],
  });

  const availableRoles = ["admin", "manager", "staff"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      systemRoles: prev.systemRoles.includes(role)
        ? prev.systemRoles.filter((r) => r !== role)
        : [...prev.systemRoles, role],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={!!initialData?.id}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="john@example.com"
          />
          {initialData?.id && (
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed after creation
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Password (only for new staff) */}
        {!initialData?.id && (
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Temporary Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Leave blank to auto-generate"
            />
            <p className="mt-1 text-xs text-gray-500">
              If left blank, a temporary password will be generated
            </p>
          </div>
        )}
      </div>

      {/* System Roles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          System Roles
        </label>
        <div className="space-y-2">
          {availableRoles.map((role) => (
            <label
              key={role}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.systemRoles.includes(role)}
                onChange={() => handleRoleToggle(role)}
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
                  {role === "staff" && "Can teach classes and take attendance"}
                </div>
              </div>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          You can assign teaching roles separately after creating the staff
          member
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {initialData?.id ? "Update Staff Member" : "Create Staff Member"}
        </button>
      </div>
    </form>
  );
}
