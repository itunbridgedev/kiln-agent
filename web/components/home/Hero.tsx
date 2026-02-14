"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Hero() {
  const { user } = useAuth();

  return (
    <section className="hero-section">
      <h2>Welcome to Kiln Agent</h2>
      <p>Explore our pottery classes, materials, and firing services</p>

      {user ? (
        <div className="hero-cta-container">
          <Link href="/membership" className="cta-button primary">
            View My Membership
          </Link>
          <p className="hero-subtitle">Unlimited open studio access, special events, and more</p>
        </div>
      ) : (
        <div className="hero-cta-container">
          <Link href="/memberships" className="cta-button primary">
            Explore Memberships
          </Link>
          <p className="hero-subtitle">Join our community and get unlimited open studio access</p>
        </div>
      )}
    </section>
  );
}
