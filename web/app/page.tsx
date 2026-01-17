"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "@/styles/Home.css";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  category: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  products: Product[];
}

export default function HomePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>Kiln Agent</h1>
          <nav className="header-nav">
            {user ? (
              <>
                <span className="user-greeting">Hi, {user.name}</span>
                <button onClick={() => router.push("/admin")} className="nav-btn">
                  Admin
                </button>
                <button onClick={handleLogout} className="nav-btn">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => router.push("/login")} className="nav-btn">
                Login
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="home-main">
        <section className="hero-section">
          <h2>Welcome to Kiln Agent</h2>
          <p>Explore our pottery classes, materials, and firing services</p>
        </section>

        <section className="products-section">
          {loadingProducts ? (
            <p>Loading products...</p>
          ) : categories.length === 0 ? (
            <p className="no-products">No products available at this time.</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="category-section">
                <h3 className="category-title">{category.name}</h3>
                {category.description && (
                  <p className="category-description">{category.description}</p>
                )}
                
                {category.products.length === 0 ? (
                  <p className="no-products">No products in this category yet.</p>
                ) : (
                  <div className="products-grid">
                    {category.products.map((product) => (
                      <div key={product.id} className="product-card">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="product-image"
                          />
                        )}
                        <div className="product-info">
                          <h4 className="product-name">{product.name}</h4>
                          {product.description && (
                            <p className="product-description">
                              {product.description}
                            </p>
                          )}
                          <p className="product-price">${product.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; 2026 Kiln Agent. All rights reserved.</p>
      </footer>
    </div>
  );
}

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Kiln Agent Dashboard</h1>
        <div className="user-info">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="user-avatar" />
          )}
          <div className="user-details">
            <p className="user-name">{user.name}</p>
            <p className="user-email">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome back, {user.name.split(" ")[0]}!</h2>
          <p>You're successfully authenticated with Next.js!</p>
          {user.roles.length > 0 && (
            <div className="roles">
              <strong>Roles:</strong> {user.roles.join(", ")}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
