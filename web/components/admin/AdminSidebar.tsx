interface AdminSidebarProps {
  activeTab: "categories" | "products";
  productCatalogExpanded: boolean;
  onTabChange: (tab: "categories" | "products") => void;
  onToggleExpanded: () => void;
  onBackHome: () => void;
}

export default function AdminSidebar({
  activeTab,
  productCatalogExpanded,
  onTabChange,
  onToggleExpanded,
}: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>Admin Panel</h2>
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
