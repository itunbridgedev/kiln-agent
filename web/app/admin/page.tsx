"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "@/styles/Admin.css";

interface Category {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: {
    products: number;
  };
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
  category: {
    id: number;
    name: string;
  };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"categories" | "products">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    displayOrder: 0,
    isActive: true,
  });

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    imageUrl: "",
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchProducts();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        setError("Failed to load categories");
      }
    } catch (err) {
      setError("Error loading categories");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/admin/products", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      
      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        await fetchCategories();
        resetCategoryForm();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save category");
      }
    } catch (err) {
      setError("Error saving category");
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : "/api/admin/products";
      
      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productForm),
      });

      if (response.ok) {
        await fetchProducts();
        resetProductForm();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save product");
      }
    } catch (err) {
      setError("Error saving product");
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete category");
      }
    } catch (err) {
      setError("Error deleting category");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchProducts();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete product");
      }
    } catch (err) {
      setError("Error deleting product");
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
      displayOrder: 0,
      isActive: true,
    });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      categoryId: "",
      imageUrl: "",
      displayOrder: 0,
      isActive: true,
    });
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const editCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const editProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      categoryId: product.categoryId.toString(),
      imageUrl: product.imageUrl || "",
      displayOrder: product.displayOrder,
      isActive: product.isActive,
    });
    setEditingProduct(product);
    setShowProductForm(true);
  };

  if (loading || !user) {
    return <div className="loading-container"><p>Loading...</p></div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={() => router.push("/")} className="nav-btn">
          Back to Home
        </button>
      </header>

      <div className="admin-content">
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === "categories" ? "active" : ""}`}
            onClick={() => setActiveTab("categories")}
          >
            Categories
          </button>
          <button
            className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            Products
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === "categories" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Product Categories</h2>
              <button
                className="add-btn"
                onClick={() => setShowCategoryForm(!showCategoryForm)}
              >
                {showCategoryForm ? "Cancel" : "+ Add Category"}
              </button>
            </div>

            {showCategoryForm && (
              <form onSubmit={handleCategorySubmit} className="admin-form">
                <h3>{editingCategory ? "Edit Category" : "New Category"}</h3>
                
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Display Order</label>
                    <input
                      type="number"
                      value={categoryForm.displayOrder}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          displayOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={categoryForm.isActive}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, isActive: e.target.checked })
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
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="data-table">
              {loadingData ? (
                <p>Loading...</p>
              ) : categories.length === 0 ? (
                <p className="no-data">No categories yet. Create your first one!</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Products</th>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td>{category.name}</td>
                        <td>{category.description || "-"}</td>
                        <td>{category._count?.products || 0}</td>
                        <td>{category.displayOrder}</td>
                        <td>
                          <span className={`status-badge ${category.isActive ? "active" : "inactive"}`}>
                            {category.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="actions">
                          <button
                            onClick={() => editCategory(category)}
                            className="edit-btn"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="delete-btn"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Products</h2>
              <button
                className="add-btn"
                onClick={() => setShowProductForm(!showProductForm)}
              >
                {showProductForm ? "Cancel" : "+ Add Product"}
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={handleProductSubmit} className="admin-form">
                <h3>{editingProduct ? "Edit Product" : "New Product"}</h3>
                
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({ ...productForm, description: e.target.value })
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
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({ ...productForm, price: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={productForm.categoryId}
                      onChange={(e) =>
                        setProductForm({ ...productForm, categoryId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select category...</option>
                      {categories.filter(c => c.isActive).map((cat) => (
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
                    value={productForm.imageUrl}
                    onChange={(e) =>
                      setProductForm({ ...productForm, imageUrl: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Display Order</label>
                    <input
                      type="number"
                      value={productForm.displayOrder}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          displayOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={productForm.isActive}
                        onChange={(e) =>
                          setProductForm({ ...productForm, isActive: e.target.checked })
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
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="data-table">
              {loadingData ? (
                <p>Loading...</p>
              ) : products.length === 0 ? (
                <p className="no-data">No products yet. Create your first one!</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.category.name}</td>
                        <td>${product.price}</td>
                        <td>{product.displayOrder}</td>
                        <td>
                          <span className={`status-badge ${product.isActive ? "active" : "inactive"}`}>
                            {product.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="actions">
                          <button
                            onClick={() => editProduct(product)}
                            className="edit-btn"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="delete-btn"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
