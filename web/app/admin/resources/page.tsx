"use client";

import ResourceManager from "@/components/admin/ResourceManager";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminResourcesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?returnTo=/admin/resources");
    }
    if (
      !loading &&
      user &&
      !user.roles.includes("admin") &&
      !user.roles.includes("manager")
    ) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin")}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Admin
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Studio Resources
                </h1>
                <p className="text-sm text-gray-600">
                  Manage equipment and capacity
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <ResourceManager />
      </main>
    </div>
  );
}
