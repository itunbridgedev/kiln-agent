import { useState } from "react";

interface AdminSidebarProps {
  activeTab: "categories" | "products";
  productCatalogExpanded: boolean;
  studioName?: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles: string[];
  };
  onTabChange: (tab: "categories" | "products") => void;
  onToggleExpanded: () => void;
  onBackHome: () => void;
  onLogout: () => void;
}

export default function AdminSidebar({
  activeTab,
  productCatalogExpanded,
  studioName,
  user,
  onTabChange,
  onToggleExpanded,
  onBackHome,
  onLogout,
}: AdminSidebarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>{studioName || "Studio Name"}</h2>
        <p className="sidebar-subtitle">Admin Panel</p>
      </div>

      {/* User Profile Section */}
      <div className="admin-user-profile">
        <button
          className="profile-trigger"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
        >
          <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <span className="user-name">{user.name}</span>
          <span className={`profile-arrow ${profileMenuOpen ? "open" : ""}`}>
            ▼
          </span>
        </button>

        {profileMenuOpen && (
          <div className="profile-menu">
            <button onClick={onBackHome} className="profile-menu-item">
              <span className="menu-icon">🏠</span>
              Back to Home
            </button>
            <button className="profile-menu-item" disabled>
              <span className="menu-icon">👤</span>
              Edit Profile
            </button>
            <button onClick={onLogout} className="profile-menu-item logout">
              <span className="menu-icon">🚪</span>
              Logout
            </button>
          </div>
        )}
      </div>

      <nav>
        <ul className="admin-sidebar-nav">
          <li className="nav-item">
            <button
              className={`nav-item-button ${productCatalogExpanded ? "active" : ""}`}
              onClick={onToggleExpanded}
            >
              <span className="nav-item-icon">📦</span>
              <span className="nav-item-label">Product Catalog</span>
              <span
                className={`nav-item-arrow ${productCatalogExpanded ? "expanded" : ""}`}
              >
                ▶
              </span>
            </button>

            <ul
              className={`nav-subitems ${productCatalogExpanded ? "expanded" : ""}`}
            >
              <li className="nav-subitem">
                <button
                  className={`nav-subitem-button ${activeTab === "categories" ? "active" : ""}`}
                  onClick={() => onTabChange("categories")}
                >
                  Categories
                </button>
              </li>
              <li className="nav-subitem">
                <button
                  className={`nav-subitem-button ${activeTab === "products" ? "active" : ""}`}
                  onClick={() => onTabChange("products")}
                >
                  Products
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
