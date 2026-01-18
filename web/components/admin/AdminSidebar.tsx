interface AdminSidebarProps {
  activeTab: "categories" | "products";
  productCatalogExpanded: boolean;
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
  user,
  onTabChange,
  onToggleExpanded,
  onBackHome,
  onLogout,
}: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>Admin Panel</h2>
      </div>

      {/* User Profile Section */}
      <div className="admin-user-profile">
        <div className="user-info">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
            <div className="user-role">Admin</div>
          </div>
        </div>
        <div className="user-actions">
          <button onClick={onBackHome} className="sidebar-action-btn" title="Go to Home">
            🏠 Home
          </button>
          <button onClick={onLogout} className="sidebar-action-btn logout-btn" title="Logout">
            🚪 Logout
          </button>
        </div>
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
