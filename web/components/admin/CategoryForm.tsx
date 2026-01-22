import { useState } from "react";

interface Category {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isSystemCategory: boolean;
  featureModule: string | null;
  parentCategoryId: number | null;
}

interface CategoryFormProps {
  editingCategory: Category | null;
  categories: Category[];
  classesSystemCategoryId: number | null;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
}

export interface CategoryFormData {
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  parentCategoryId: number | null;
}

export default function CategoryForm({
  editingCategory,
  categories,
  classesSystemCategoryId,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: editingCategory?.name || "",
    description: editingCategory?.description || "",
    displayOrder: editingCategory?.displayOrder || 0,
    isActive: editingCategory?.isActive ?? true,
    parentCategoryId: editingCategory?.parentCategoryId || classesSystemCategoryId,
  });

  // Filter out current category and its descendants to prevent circular references
  const availableParentCategories = categories.filter(
    (cat) =>
      !editingCategory ||
      (cat.id !== editingCategory.id &&
        cat.parentCategoryId !== editingCategory.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-lg shadow-sm p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900">
        {editingCategory ? "Edit Category" : "New Category"}
      </h3>
      {editingCategory?.isSystemCategory && (
        <div className="p-3 bg-blue-50 border border-blue-300 rounded-md text-sm text-blue-800">
          ⓘ This is a system category. The name cannot be changed.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={editingCategory?.isSystemCategory}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Order
          </label>
          <input
            type="number"
            value={formData.displayOrder}
            onChange={(e) =>
              setFormData({
                ...formData,
                displayOrder: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked })
            }
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
            Active
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
        >
          {editingCategory ? "Update" : "Create"} Category
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
