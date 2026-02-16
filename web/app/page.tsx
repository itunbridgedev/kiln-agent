"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import MarketingPage from "@/components/marketing/MarketingPage";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import "@/styles/Marketing.css";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ClassItem {
  id: number;
  name: string;
  description: string | null;
  classType: string;
  price: number;
  imageUrl: string | null;
  skillLevel: string | null;
  schedules: { id: number }[];
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
  const [studioName, setStudioName] = useState<string>("");
  const [isRootDomain, setIsRootDomain] = useState<boolean>(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchStudioInfo();
    Promise.all([fetchClasses(), fetchMemberships()]).finally(() =>
      setLoadingData(false)
    );
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

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/registrations/classes");
      if (response.ok) {
        const data: ClassItem[] = await response.json();
        // Exclude open-studio type classes — those have their own page
        setClasses(data.filter((c) => c.classType !== "open-studio"));
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
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

        {/* Classes Section */}
        {loadingData ? (
          <section className="products-section">
            <p>Loading...</p>
          </section>
        ) : (
          <>
            {classes.length > 0 && (
              <section className="products-section">
                <div className="category-section">
                  <h3 className="category-title">Classes</h3>
                  <p className="category-description">
                    Browse our pottery classes and sign up for upcoming sessions.
                  </p>
                  <div className="products-grid">
                    {classes.map((c) => (
                      <Link
                        key={c.id}
                        href={`/classes/${c.id}`}
                        className="product-card"
                        style={{ textDecoration: "none" }}
                      >
                        {c.imageUrl && (
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="product-image"
                          />
                        )}
                        <div className="product-info">
                          <h4 className="product-name">{c.name}</h4>
                          {c.description && (
                            <p className="product-description">{c.description}</p>
                          )}
                          <p className="product-price">
                            ${(typeof c.price === 'string' ? parseFloat(c.price) : c.price).toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

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
                      <Link
                        key={m.id}
                        href="/memberships"
                        className="product-card"
                        style={{ textDecoration: "none" }}
                      >
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
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
