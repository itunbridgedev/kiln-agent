import { useState } from "react";

export type AdminTab =
  | "schedule"
  | "studio-calendar"
  | "categories"
  | "classes"
  | "teaching-roles"
  | "resources"
  | "users"
  | "membership-tiers"
  | "open-studio"
  | "stripe-connect";

interface AdminSidebarProps {
  activeTab: AdminTab;
  classesExpanded: boolean;
  scheduleExpanded: boolean;
  membershipsExpanded: boolean;
  settingsExpanded: boolean;
  studioName?: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles: string[];
  };
  isOpen: boolean;
  onTabChange: (tab: AdminTab) => void;
  onToggleClassesExpanded: () => void;
  onToggleScheduleExpanded: () => void;
  onToggleMembershipsExpanded: () => void;
  onToggleSettingsExpanded: () => void;
  onBackHome: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export default function AdminSidebar({
  activeTab,
  classesExpanded,
  scheduleExpanded,
  membershipsExpanded,
  settingsExpanded,
  studioName,
  user,
  isOpen,
  onTabChange,
  onToggleClassesExpanded,
  onToggleScheduleExpanded,
  onToggleMembershipsExpanded,
  onToggleSettingsExpanded,
  onBackHome,
  onLogout,
  onClose,
}: AdminSidebarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleTabChange = (tab: AdminTab) => {
    onTabChange(tab);
    onClose(); // Close mobile menu after selection
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gradient-to-br from-primary to-secondary text-white
        flex-shrink-0 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="p-6 border-b border-white/20 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {studioName || "Studio Name"}
            </h2>
            <p className="text-sm text-white/80 mt-1">Admin Panel</p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-white/80 hover:text-white p-2"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
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
            {/* Schedule Section - Collapsible */}
            <li>
              <button
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  scheduleExpanded ? "bg-white/20" : "hover:bg-white/10"
                }`}
                onClick={onToggleScheduleExpanded}
              >
                <span className="text-xl">📅</span>
                <span className="flex-1 text-left font-medium">Schedule</span>
                <span
                  className={`transition-transform text-sm ${
                    scheduleExpanded ? "rotate-90" : ""
                  }`}
                >
                  ▶
                </span>
              </button>

              <ul
                className={`mt-1 ml-4 space-y-1 overflow-hidden transition-all ${
                  scheduleExpanded ? "max-h-60" : "max-h-0"
                }`}
              >
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${
                      activeTab === "schedule"
                        ? "bg-white/30 font-semibold"
                        : "hover:bg-white/10"
                    }`}
                    onClick={() => handleTabChange("schedule")}
                  >
                    My Schedule
                  </button>
                </li>
                {(user.roles.includes("manager") ||
                  user.roles.includes("admin")) && (
                  <li>
                    <button
                      className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${
                        activeTab === "studio-calendar"
                          ? "bg-white/30 font-semibold"
                          : "hover:bg-white/10"
                      }`}
                      onClick={() => handleTabChange("studio-calendar")}
                    >
                      Studio Calendar
                    </button>
                  </li>
                )}
              </ul>
            </li>

            {/* Classes Section - Available to managers and admins */}
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
                    onClick={() => handleTabChange("categories")}
                  >
                    Categories
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "classes" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                    onClick={() => handleTabChange("classes")}
                  >
                    All Classes
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "teaching-roles" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                    onClick={() => handleTabChange("teaching-roles")}
                  >
                    Teaching Roles
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "resources" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                    onClick={() => handleTabChange("resources")}
                  >
                    Studio Resources
                  </button>
                </li>
              </ul>
            </li>

            <li>
              <button
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === "users" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
                onClick={() => handleTabChange("users")}
              >
                <span className="text-xl">👥</span>
                <span className="flex-1 text-left font-medium">Users</span>
              </button>
            </li>

            {/* Memberships Section - Collapsible */}
            <li>
              <button
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${membershipsExpanded ? "bg-white/20" : "hover:bg-white/10"}`}
                onClick={onToggleMembershipsExpanded}
              >
                <span className="text-xl">🏷️</span>
                <span className="flex-1 text-left font-medium">Memberships</span>
                <span
                  className={`transition-transform text-sm ${membershipsExpanded ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
              </button>

              <ul
                className={`mt-1 ml-4 space-y-1 overflow-hidden transition-all ${membershipsExpanded ? "max-h-60" : "max-h-0"}`}
              >
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "membership-tiers" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                    onClick={() => handleTabChange("membership-tiers")}
                  >
                    Membership Tiers
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "open-studio" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                    onClick={() => handleTabChange("open-studio")}
                  >
                    Open Studio
                  </button>
                </li>
              </ul>
            </li>

            {/* Settings Section - Admin only */}
            {user.roles.includes("admin") && (
              <li>
                <button
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${settingsExpanded ? "bg-white/20" : "hover:bg-white/10"}`}
                  onClick={onToggleSettingsExpanded}
                >
                  <span className="text-xl">⚙️</span>
                  <span className="flex-1 text-left font-medium">Settings</span>
                  <span
                    className={`transition-transform text-sm ${settingsExpanded ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                </button>

                <ul
                  className={`mt-1 ml-4 space-y-1 overflow-hidden transition-all ${settingsExpanded ? "max-h-60" : "max-h-0"}`}
                >
                  <li>
                    <button
                      className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${activeTab === "stripe-connect" ? "bg-white/30 font-semibold" : "hover:bg-white/10"}`}
                      onClick={() => handleTabChange("stripe-connect")}
                    >
                      Stripe Connect
                    </button>
                  </li>
                </ul>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
