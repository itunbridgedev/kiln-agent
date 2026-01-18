"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import ProductCatalog from "@/components/home/ProductCatalog";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
      <Header
        user={user}
        onLogout={handleLogout}
        onNavigateAdmin={() => router.push("/admin")}
        onNavigateLogin={() => router.push("/login")}
      />

      <main className="home-main">
        <Hero />
        <ProductCatalog categories={categories} loading={loadingProducts} />
      </main>

      <Footer />
    </div>
  );
}
