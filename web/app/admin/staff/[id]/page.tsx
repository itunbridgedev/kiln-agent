"use client";

import { useAuth } from "@/context/AuthContext";
import "@/styles/Admin.css";
import "@/styles/AdminLayout.css";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TeachingRole {
  id: number;
  name: string;
  certifiedAt: string | null;
  notes: string | null;
}

interface StaffProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  picture: string | null;
  createdAt: string;
  systemRoles: string[];
  teachingRoles: TeachingRole[];
}

interface AssignedClass {
  id: number;
  name: string;
  description: string | null;
  classType: string;
  skillLevel: string | null;
  maxStudents: number;
  price: string;
  isActive: boolean;
  category: {
    id: number;
    name: string;
  };
  teachingRole: {
    id: number;
    name: string;
  };
}

export default function StaffProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const staffId = params?.id as string;

  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && staffId) {
      fetchStaffProfile();
      fetchAssignedClasses();
    }
  }, [user, staffId]);

  const fetchStaffProfile = async () => {
    try {
      const response = await fetch(`/api/admin/users/${staffId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStaffProfile(data);
      } else {
        setError("Failed to load staff profile");
      }
    } catch (err) {
      console.error("Error loading staff profile:", err);
      setError("Error loading staff profile");
    }
  };

  const fetchAssignedClasses = async () => {
    try {
      // Get all classes and filter by teaching roles this staff member has
      const response = await fetch("/api/admin/classes", {
        credentials: "include",
      });

      if (response.ok) {
        const allClasses = await response.json();
        
        // We'll need to filter on the client side for now
        // In a production app, you'd want a dedicated API endpoint
        setAssignedClasses(allClasses);
      }
    } catch (err) {
      console.error("Error loading classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not certified";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-layout">
        <main className="admin-content">
          <div className="error-message">{error}</div>
          <button onClick={() => router.push("/admin")} className="nav-btn">
            Back to Admin
          </button>
        </main>
      </div>
    );
  }

  if (!staffProfile) {
    return (
      <div className="admin-layout">
        <main className="admin-content">
          <p>Staff member not found</p>
          <button onClick={() => router.push("/admin")} className="nav-btn">
            Back to Admin
          </button>
        </main>
      </div>
    );
  }

  // Filter classes where the staff member has the required teaching role
  const relevantClasses = assignedClasses.filter((cls) =>
    staffProfile.teachingRoles.some((tr) => tr.id === cls.teachingRole?.id)
  );

  return (
    <div className="admin-layout">
      <main className="admin-content" style={{ marginLeft: 0, width: "100%" }}>
        <div className="admin-content-header">
          <button
            onClick={() => router.push("/admin")}
            className="nav-btn"
            style={{ marginBottom: "16px" }}
          >
            ← Back to Admin
          </button>
          <h1>Staff Profile</h1>
        </div>

        {/* Profile Header */}
        <div
          style={{
            background: "white",
            padding: "32px",
            borderRadius: "8px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "32px",
                fontWeight: "bold",
              }}
            >
              {staffProfile.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "28px" }}>
                {staffProfile.name}
              </h2>
              <p style={{ margin: "0 0 4px 0", color: "#666" }}>
                {staffProfile.email}
              </p>
              {staffProfile.phone && (
                <p style={{ margin: "0 0 4px 0", color: "#666" }}>
                  {staffProfile.phone}
                </p>
              )}
              <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#999" }}>
                Member since {formatJoinDate(staffProfile.createdAt)}
              </p>
            </div>
          </div>

          {/* System Roles */}
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#333" }}>
              System Roles
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {staffProfile.systemRoles.map((role) => (
                <span
                  key={role}
                  style={{
                    padding: "4px 12px",
                    background: "#f0f0f0",
                    borderRadius: "16px",
                    fontSize: "14px",
                    color: "#333",
                    textTransform: "capitalize",
                  }}
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Teaching Roles & Qualifications */}
        <div
          style={{
            background: "white",
            padding: "32px",
            borderRadius: "8px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ fontSize: "22px", marginBottom: "20px" }}>
            Teaching Roles & Qualifications
          </h2>

          {staffProfile.teachingRoles.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>
              No teaching roles assigned yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {staffProfile.teachingRoles.map((role) => (
                <div
                  key={role.id}
                  style={{
                    padding: "20px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "18px",
                          color: "#333",
                        }}
                      >
                        {role.name}
                      </h3>
                      <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                        Certified: {formatDate(role.certifiedAt)}
                      </p>
                      {role.notes && (
                        <p
                          style={{
                            margin: "12px 0 0 0",
                            fontSize: "14px",
                            color: "#555",
                            fontStyle: "italic",
                          }}
                        >
                          {role.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Classes */}
        <div
          style={{
            background: "white",
            padding: "32px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ fontSize: "22px", marginBottom: "20px" }}>
            Classes Assigned to Teaching Roles
          </h2>

          {relevantClasses.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>
              No classes assigned to this staff member's teaching roles yet.
            </p>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Class Name</th>
                    <th>Category</th>
                    <th>Teaching Role</th>
                    <th>Skill Level</th>
                    <th>Price</th>
                    <th>Max Students</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantClasses.map((cls) => (
                    <tr key={cls.id}>
                      <td>
                        <strong>{cls.name}</strong>
                        {cls.description && (
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {cls.description}
                          </div>
                        )}
                      </td>
                      <td>{cls.category.name}</td>
                      <td>{cls.teachingRole?.name || "—"}</td>
                      <td>{cls.skillLevel || "—"}</td>
                      <td>${cls.price}</td>
                      <td>{cls.maxStudents}</td>
                      <td>
                        <span
                          className={`status-badge ${cls.isActive ? "active" : "inactive"}`}
                        >
                          {cls.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
