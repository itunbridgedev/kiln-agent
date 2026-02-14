"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  studioName?: string;
}

export default function Header({ studioName }: HeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasStaffAccess = user?.roles?.some((role) =>
    ["admin", "manager", "staff"].includes(role)
  );

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navLinks = user
    ? [
        { href: "/", label: "Home" },
        { href: "/open-studio", label: "Open Studio" },
        { href: "/memberships", label: "Memberships" },
        { href: "/my-reservations", label: "My Reservations" },
        ...(hasStaffAccess ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/open-studio", label: "Open Studio" },
        { href: "/memberships", label: "Memberships" },
        { href: "/login", label: "Login" },
      ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="home-header">
      <div className="header-content">
        <div className="header-branding">
          <h1>
            <Link href="/" className="header-brand-link">
              {studioName || "Kiln Agent"}
            </Link>
          </h1>
          <p className="header-subtitle">powered by Kiln Agent</p>
        </div>

        {/* Desktop nav */}
        <nav className="header-nav">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${isActive(link.href) ? " nav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <span className="user-greeting">Hi, {user.name}</span>
              <button onClick={handleLogout} className="nav-link nav-logout-btn">
                Logout
              </button>
            </>
          )}
        </nav>

        {/* Hamburger button */}
        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="mobile-nav-backdrop" onClick={closeMobile} />
      )}
      <div className={`mobile-nav-panel${mobileOpen ? " mobile-nav-open" : ""}`}>
        <button className="mobile-nav-close" onClick={closeMobile}>
          &times;
        </button>
        <nav className="mobile-nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-nav-link${isActive(link.href) ? " nav-link-active" : ""}`}
              onClick={closeMobile}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <span className="mobile-nav-greeting">Hi, {user.name}</span>
              <button
                onClick={() => {
                  closeMobile();
                  handleLogout();
                }}
                className="mobile-nav-link nav-logout-btn"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
