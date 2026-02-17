"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  studioName?: string;
}

interface Subscription {
  id: number;
  status: string;
}

interface PunchPass {
  id: number;
  name: string;
}

export default function Header({ studioName }: HeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>([]);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasStaffAccess = user?.roles?.some((role) =>
    ["admin", "manager", "staff"].includes(role)
  );

  // Fetch subscription and punch passes when user is available
  useEffect(() => {
    if (user && dropdownOpen) {
      fetchSubscription();
      fetchPunchPasses();
    }
  }, [user, dropdownOpen]);

  const fetchSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const response = await fetch("/api/memberships/my-subscription", {
        credentials: "include",
      });
      if (response.ok) {
        setSubscription(await response.json());
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchPunchPasses = async () => {
    try {
      const response = await fetch("/api/punch-passes/my-passes", {
        credentials: "include",
      });
      if (response.ok) {
        setPunchPasses(await response.json());
      }
    } catch (err) {
      console.error("Error fetching punch passes:", err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
            <div className="user-menu-container" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="user-avatar-btn"
                aria-label="User menu"
                title={user.name}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="avatar-image" />
                ) : (
                  <span className="avatar-initials">{getInitials(user.name)}</span>
                )}
              </button>
              {dropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-user-name">{user.name}</div>
                  {(subscription?.status || punchPasses.length > 0) && (
                    <Link href="/membership" className="dropdown-link">
                      My Membership
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="dropdown-link dropdown-logout"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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
              <div className="mobile-user-section">
                <div className="mobile-user-name">{user.name}</div>
                {subscription?.status && (
                  <Link
                    href="/membership"
                    className="mobile-nav-link"
                    onClick={closeMobile}
                  >
                    My Membership
                  </Link>
                )}
                <button
                  onClick={() => {
                    closeMobile();
                    handleLogout();
                  }}
                  className="mobile-nav-link nav-logout-btn"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
