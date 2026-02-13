"use client";

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface HeroProps {
  user: User | null;
  onNavigateMembership: () => void;
}

export default function Hero({ user, onNavigateMembership }: HeroProps) {
  return (
    <section className="hero-section">
      <h2>Welcome to Kiln Agent</h2>
      <p>Explore our pottery classes, materials, and firing services</p>
      
      {user ? (
        <div className="hero-cta-container">
          <button onClick={onNavigateMembership} className="cta-button primary">
            View My Membership
          </button>
          <p className="hero-subtitle">Unlimited open studio access, special events, and more</p>
        </div>
      ) : (
        <div className="hero-cta-container">
          <button onClick={onNavigateMembership} className="cta-button primary">
            Explore Memberships
          </button>
          <p className="hero-subtitle">Join our community and get unlimited open studio access</p>
        </div>
      )}
    </section>
  );
}
