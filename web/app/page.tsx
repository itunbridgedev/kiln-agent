"use client";

import { useAuth } from "@/context/AuthContext";
import "@/styles/Dashboard.css";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Kiln Agent Dashboard</h1>
        <div className="user-info">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="user-avatar" />
          )}
          <div className="user-details">
            <p className="user-name">{user.name}</p>
            <p className="user-email">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome back, {user.name.split(" ")[0]}!</h2>
          <p>You're successfully authenticated with Next.js!</p>
          {user.roles.length > 0 && (
            <div className="roles">
              <strong>Roles:</strong> {user.roles.join(", ")}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
