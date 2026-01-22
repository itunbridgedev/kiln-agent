"use client";

import React, { useState } from "react";

export interface TeachingRoleFormData {
  name: string;
  description: string | null;
}

interface TeachingRoleFormProps {
  initialData?: Partial<TeachingRoleFormData>;
  onSubmit: (data: TeachingRoleFormData) => void;
  onCancel: () => void;
}

export default function TeachingRoleForm({
  initialData,
  onSubmit,
  onCancel,
}: TeachingRoleFormProps) {
  const [formData, setFormData] = useState<TeachingRoleFormData>({
    name: "",
    description: "",
    ...initialData,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Role Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., Basic Teacher, Glazing Specialist"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ""}
          onChange={handleChange}
          rows={3}
          placeholder="Describe what this teaching role covers..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {initialData ? "Update Role" : "Create Role"}
        </button>
      </div>
    </form>
  );
}
