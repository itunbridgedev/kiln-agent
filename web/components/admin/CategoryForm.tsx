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
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: editingCategory?.name || "",
    description: editingCategory?.description || "",
    displayOrder: editingCategory?.displayOrder || 0,
    isActive: editingCategory?.isActive ?? true,
    parentCategoryId: editingCategory?.parentCategoryId || null,
  });

  // Filter out current category and its descendants to prevent circular references
  const availableParentCategories = categories.filter(
    (cat) => !editingCategory || (cat.id !== editingCategory.id && cat.parentCategoryId !== editingCategory.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <h3>{editingCategory ? "Edit Category" : "New Category"}</h3>
      {editingCategory?.isSystemCategory && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#eff6ff",
            border: "1px solid #3b82f6",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "0.9em",
            color: "#1e40af",
          }}
        >
          ⓘ This is a system category. The name cannot be changed.
        </div>
      )}

      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={editingCategory?.isSystemCategory}
          required
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Parent Category (Optional)</label>
        <select
          value={formData.parentCategoryId || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              parentCategoryId: e.target.value ? parseInt(e.target.value) : null,
            })
          }
        >
          <option value="">None (Top-level category)</option>
          {availableParentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Display Order</label>
          <input
            type="number"
            value={formData.displayOrder}
            onChange={(e) =>
              setFormData({
                ...formData,
                displayOrder: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
            />
            <span>Active</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-btn">
          {editingCategory ? "Update" : "Create"} Category
        </button>
        <button type="button" onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
      </div>
    </form>
  );
}
