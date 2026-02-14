"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import ProductCatalog from "@/components/home/ProductCatalog";
import MarketingPage from "@/components/marketing/MarketingPage";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import "@/styles/Marketing.css";
import Link from "next/link";
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

interface Membership {
  id: number;
  name: string;
  description: string | null;
  price: string;
  billingPeriod: string;
}

export default function HomePage() {
  const { loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [studioName, setStudioName] = useState<string>("");
  const [isRootDomain, setIsRootDomain] = useState<boolean>(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    fetchStudioInfo();
    fetchProducts();
    fetchMemberships();
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

  const fetchMemberships = async () => {
    try {
      const response = await fetch("/api/memberships", { credentials: "include" });
      if (response.ok) {
        setMemberships(await response.json());
      }
    } catch (error) {
      console.error("Error fetching memberships:", error);
    }
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
      <Header studioName={studioName} />

      <main className="home-main">
        <Hero />
        <ProductCatalog categories={categories} loading={loadingProducts} />

        {/* Memberships Section */}
        {memberships.length > 0 && (
          <section className="products-section">
            <div className="category-section">
              <h3 className="category-title">Memberships</h3>
              <p className="category-description">
                Join our studio and get access to Open Studio time, special resources, and more.
              </p>
              <div className="products-grid">
                {memberships.map((m) => (
                  <Link key={m.id} href="/memberships" className="product-card" style={{ textDecoration: "none" }}>
                    <div className="product-info">
                      <h4 className="product-name">{m.name}</h4>
                      {m.description && (
                        <p className="product-description">{m.description}</p>
                      )}
                      <p className="product-price">
                        ${parseFloat(m.price).toFixed(2)}/{m.billingPeriod.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
