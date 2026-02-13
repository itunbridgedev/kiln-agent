"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import ProductCatalog from "@/components/home/ProductCatalog";
import MarketingPage from "@/components/marketing/MarketingPage";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import "@/styles/Marketing.css";
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
  const [studioName, setStudioName] = useState<string>("");
  const [isRootDomain, setIsRootDomain] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchStudioInfo();
    fetchProducts();
  }, []);

  const fetchStudioInfo = async () => {
    try {
      const response = await fetch("/api/studio", {
        headers: {
          "X-Original-Host": window.location.hostname,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStudioName(data.name);
        setIsRootDomain(data.isRootDomain || false);
      }
    } catch (error) {
      console.error("Error fetching studio info:", error);
    }
  };

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

  // Show marketing page for root domain
  if (isRootDomain) {
    return <MarketingPage />;
  }

  return (
    <div className="home-container">
      <Header
        user={user}
        studioName={studioName}
        onLogout={handleLogout}
        onNavigateAdmin={() => router.push("/admin")}
        onNavigateLogin={() => router.push("/login")}
        onNavigateReservations={() => router.push("/my-reservations")}
        onNavigateMembership={() => router.push(user ? "/membership" : "/memberships")}
      />

      <main className="home-main">
        <Hero user={user} onNavigateMembership={() => router.push(user ? "/membership" : "/memberships")} />
        <ProductCatalog categories={categories} loading={loadingProducts} />
      </main>

      <Footer />
    </div>
  );
}
