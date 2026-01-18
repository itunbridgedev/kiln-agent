"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import CategoryForm, {
  CategoryFormData,
} from "@/components/admin/CategoryForm";
import CategoryTable from "@/components/admin/CategoryTable";
import ProductForm, { ProductFormData } from "@/components/admin/ProductForm";
import ProductTable from "@/components/admin/ProductTable";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Admin.css";
import "@/styles/AdminLayout.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"categories" | "products">(
    "categories"
  );
  const [productCatalogExpanded, setProductCatalogExpanded] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    // Check if user has admin role
    if (!loading && user && !user.roles?.includes("admin")) {
      setAccessDenied(true);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.roles?.includes("admin")) {
      fetchCategories();
      fetchProducts();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      console.log("[Admin] Fetching categories...");
      const response = await fetch("/api/admin/categories", {
        credentials: "include",
      });
      console.log("[Admin] Categories response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("[Admin] Categories loaded:", data.length);
        setCategories(data);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error(
          "[Admin] Failed to load categories:",
          response.status,
          errorData
        );
        setError(
          `Failed to load categories: ${errorData.error || response.statusText}`
        );
      }
    } catch (err) {
      console.error("[Admin] Error loading categories:", err);
      setError("Error loading categories");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log("[Admin] Fetching products...");
      const response = await fetch("/api/admin/products", {
        credentials: "include",
      });
      console.log("[Admin] Products response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("[Admin] Products loaded:", data.length);
        setProducts(data);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error(
          "[Admin] Failed to load products:",
          response.status,
          errorData
        );
      }
    } catch (err) {
      console.error("[Admin] Error loading products:", err);
    }
  };

  const handleCategorySubmit = async (formData: CategoryFormData) => {
    setError("");

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
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

  const handleProductSubmit = async (formData: ProductFormData) => {
    setError("");

    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : "/api/admin/products";

      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
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
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="loading-container">
        <div
          className="error-message"
          style={{ maxWidth: "500px", textAlign: "center" }}
        >
          <h2>Access Denied</h2>
          <p>You do not have permission to access the admin area.</p>
          <p>Only users with admin role can access this page.</p>
          <button
            onClick={() => router.push("/")}
            className="nav-btn"
            style={{ marginTop: "20px" }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        productCatalogExpanded={productCatalogExpanded}
        user={user}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setProductCatalogExpanded(true);
        }}
        onToggleExpanded={() =>
          setProductCatalogExpanded(!productCatalogExpanded)
        }
        onBackHome={() => router.push("/")}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="admin-content">
        <div className="admin-content-header">
          <h1>
            {activeTab === "categories" ? "Product Categories" : "Products"}
          </h1>
          <p>Manage your product catalog</p>
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
              <CategoryForm
                editingCategory={editingCategory}
                onSubmit={handleCategorySubmit}
                onCancel={resetCategoryForm}
              />
            )}

            <div className="data-table">
              <CategoryTable
                categories={categories}
                loading={loadingData}
                onEdit={editCategory}
                onDelete={deleteCategory}
              />
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
              <ProductForm
                editingProduct={editingProduct}
                categories={categories}
                onSubmit={handleProductSubmit}
                onCancel={resetProductForm}
              />
            )}

            <div className="data-table">
              <ProductTable
                products={products}
                loading={loadingData}
                onEdit={editProduct}
                onDelete={deleteProduct}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
