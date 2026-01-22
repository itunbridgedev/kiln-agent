import { useState } from "react";

interface AdminSidebarProps {
  activeTab: "categories" | "classes" | "teaching-roles" | "users";
  classesExpanded: boolean;
  studioName?: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles: string[];
  };
  onTabChange: (
    tab: "categories" | "classes" | "teaching-roles" | "users"
  ) => void;
  onToggleClassesExpanded: () => void;
  onBackHome: () => void;
  onLogout: () => void;
}

export default function AdminSidebar({
  activeTab,
  classesExpanded,
  studioName,
  user,
  onTabChange,
  onToggleClassesExpanded,
  onBackHome,
  onLogout,
}: AdminSidebarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <aside className="w-64 bg-gradient-to-br from-primary to-secondary text-white flex-shrink-0 flex flex-col">
      <div className="p-6 border-b border-white/20">
        <h2 className="text-2xl font-bold">{studioName || "Studio Name"}</h2>
        <p className="text-sm text-white/80 mt-1">Admin Panel</p>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-white/20 relative">
        <button
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
        >
          <div className="w-10 h-10 bg-white text-primary rounded-full flex items-center justify-center font-bold text-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="flex-1 text-left font-medium">{user.name}</span>
          <span
            className={`transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>

        {profileMenuOpen && (
          <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-lg shadow-lg py-2 z-50">
            <button
              onClick={onBackHome}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
            >
              <span>🏠</span>
              Back to Home
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-gray-400 text-sm cursor-not-allowed"
              disabled
            >
              <span>👤</span>
              Edit Profile
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-error/10 text-error text-sm"
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          <li>
            <button
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${classesExpanded ? "bg-white/20" : "hover:bg-white/10"}`}
              onClick={onToggleClassesExpanded}
            >
              <span className="text-xl">🎓</span>
              <span className="flex-1 text-left font-medium">Classes</span>
              <span
                className={`transition-transform text-sm ${classesExpanded ? "rotate-90" : ""}`}
              >
                ▶
              </span>
            </button>

            <ul
              className={`mt-1 ml-4 space-y-1 overflow-hidden transition-all ${classesExpanded ? "max-h-60" : "max-h-0"}`}
            >
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "categories" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                  onClick={() => onTabChange("categories")}
                >
                  Categories
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "classes" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                  onClick={() => onTabChange("classes")}
                >
                  All Classes
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "teaching-roles" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                  onClick={() => onTabChange("teaching-roles")}
                >
                  Teaching Roles
                </button>
              </li>
            </ul>
          </li>

          <li>
            <button
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === "users" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
              onClick={() => onTabChange("users")}
            >
              <span className="text-xl">👥</span>
              <span className="flex-1 text-left font-medium">Users</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
