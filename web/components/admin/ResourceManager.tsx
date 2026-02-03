"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface StudioResource {
  id: number;
  name: string;
  description: string | null;
  quantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ResourceFormData {
  name: string;
  description: string;
  quantity: string;
}

export default function ResourceManager() {
  const [resources, setResources] = useState<StudioResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<StudioResource | null>(
    null
  );
  const [formData, setFormData] = useState<ResourceFormData>({
    name: "",
    description: "",
    quantity: "1",
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/resources`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch resources");
      }

      const data = await response.json();
      setResources(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingResource
        ? `${API_BASE_URL}/api/admin/resources/${editingResource.id}`
        : `${API_BASE_URL}/api/admin/resources`;

      const response = await fetch(url, {
        method: editingResource ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save resource");
      }

      await fetchResources();
      setShowForm(false);
      setEditingResource(null);
      setFormData({ name: "", description: "", quantity: "1" });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (resource: StudioResource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      description: resource.description || "",
      quantity: resource.quantity.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this resource?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/resources/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete resource");
      }

      await fetchResources();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (resource: StudioResource) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/resources/${resource.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...resource,
            isActive: !resource.isActive,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update resource");
      }

      await fetchResources();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingResource(null);
    setFormData({ name: "", description: "", quantity: "1" });
  };

  if (loading) {
    return <div className="p-6">Loading resources...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Studio Resources</h2>
          <p className="text-gray-600 mt-1">
            Manage pottery wheels, kilns, and other studio equipment
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Resource
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Resource Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingResource ? "Edit Resource" : "Add New Resource"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Pottery Wheel, Kiln, Glazing Station"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional notes about this resource"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingResource ? "Update Resource" : "Create Resource"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources List */}
      {resources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            No resources configured yet. Add your first resource to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className={`bg-white border rounded-lg p-4 ${
                resource.isActive
                  ? "border-gray-200"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {resource.name}
                  </h3>
                  {resource.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {resource.description}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    resource.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {resource.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 mb-4">
                <span className="text-2xl font-bold text-blue-600">
                  {resource.quantity}
                </span>
                <span className="text-gray-600 ml-1">available</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(resource)}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(resource)}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  {resource.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(resource.id)}
                  className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
