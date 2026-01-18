import { useState } from "react";

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  categoryId: number;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface ProductFormProps {
  editingProduct: Product | null;
  categories: Category[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
}

export default function ProductForm({
  editingProduct,
  categories,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: editingProduct?.name || "",
    description: editingProduct?.description || "",
    price: editingProduct?.price || "",
    categoryId: editingProduct?.categoryId.toString() || "",
    imageUrl: editingProduct?.imageUrl || "",
    displayOrder: editingProduct?.displayOrder || 0,
    isActive: editingProduct?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <h3>{editingProduct ? "Edit Product" : "New Product"}</h3>

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
          <label>Price *</label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            required
          />
        </div>

        <div className="form-group">
          <label>Category *</label>
          <select
            value={formData.categoryId}
            onChange={(e) =>
              setFormData({ ...formData, categoryId: e.target.value })
            }
            required
          >
            <option value="">Select category...</option>
            {categories
              .filter((c) => c.isActive)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Image URL</label>
        <input
          type="url"
          value={formData.imageUrl}
          onChange={(e) =>
            setFormData({ ...formData, imageUrl: e.target.value })
          }
          placeholder="https://example.com/image.jpg"
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
          {editingProduct ? "Update" : "Create"} Product
        </button>
        <button type="button" onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
      </div>
    </form>
  );
}
