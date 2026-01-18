import { useState } from "react";

interface Category {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface CategoryFormProps {
  editingCategory: Category | null;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
}

export interface CategoryFormData {
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export default function CategoryForm({
  editingCategory,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: editingCategory?.name || "",
    description: editingCategory?.description || "",
    displayOrder: editingCategory?.displayOrder || 0,
    isActive: editingCategory?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <h3>{editingCategory ? "Edit Category" : "New Category"}</h3>

      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
