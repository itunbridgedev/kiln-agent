"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

interface Studio {
  id: number;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  stripeAccountId: string | null;
  stripeAccountStatus: string | null;
  stripeChargesEnabled: boolean;
  platformFeePercentage: number;
  isCustomFee: boolean;
  customerCount: number;
  classCount: number;
}

interface DashboardStats {
  studioCount: number;
  activeStudioCount: number;
  customerCount: number;
}

export default function PlatformAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [editFee, setEditFee] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.isPlatformAdmin) {
      fetchData();
    }
  }, [authLoading, user]);

  async function fetchData() {
    try {
      setLoading(true);
      const [studiosRes, dashboardRes] = await Promise.all([
        fetch("/api/platform/studios", { credentials: "include" }),
        fetch("/api/platform/dashboard", { credentials: "include" }),
      ]);

      if (!studiosRes.ok || !dashboardRes.ok) {
        throw new Error("Failed to fetch platform data");
      }

      const [studiosData, dashboardData] = await Promise.all([
        studiosRes.json(),
        dashboardRes.json(),
      ]);

      setStudios(studiosData);
      setStats(dashboardData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFee() {
    if (!editingStudio) return;
    setSaving(true);

    try {
      const feeValue =
        editFee.trim() === "" ? null : parseFloat(editFee) / 100;

      if (feeValue !== null && (isNaN(feeValue) || feeValue < 0 || feeValue > 1)) {
        setError("Fee must be between 0% and 100%");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/platform/studios/${editingStudio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platformFeePercentage: feeValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update fee");
      }

      setEditingStudio(null);
      setEditFee("");
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(studio: Studio) {
    try {
      const res = await fetch(`/api/platform/studios/${studio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !studio.isActive }),
      });

      if (!res.ok) {
        throw new Error("Failed to update studio status");
      }

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user?.isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You do not have platform admin access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Platform Admin
        </h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 text-sm underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Total Studios
              </h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.studioCount}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Active Studios
              </h3>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.activeStudioCount}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Total Customers
              </h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.customerCount}
              </p>
            </div>
          </div>
        )}

        {/* Studios Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Studios</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Studio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stripe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studios.map((studio) => (
                    <tr key={studio.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {studio.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {studio.subdomain}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            studio.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {studio.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            studio.stripeChargesEnabled
                              ? "bg-green-100 text-green-800"
                              : studio.stripeAccountId
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {studio.stripeChargesEnabled
                            ? "Connected"
                            : studio.stripeAccountId
                              ? "Pending"
                              : "Not Started"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingStudio?.id === studio.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={editFee}
                              onChange={(e) => setEditFee(e.target.value)}
                              placeholder="e.g. 3"
                              className="w-20 px-2 py-1 border rounded text-sm"
                            />
                            <span className="text-sm text-gray-500">%</span>
                            <button
                              onClick={handleSaveFee}
                              disabled={saving}
                              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingStudio(null);
                                setEditFee("");
                              }}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">
                              {(studio.platformFeePercentage * 100).toFixed(1)}%
                            </span>
                            {studio.isCustomFee && (
                              <span className="text-xs text-blue-600">
                                (custom)
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditingStudio(studio);
                                setEditFee(
                                  (
                                    studio.platformFeePercentage * 100
                                  ).toFixed(1)
                                );
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {studio.customerCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {studio.classCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(studio)}
                          className={`text-sm ${
                            studio.isActive
                              ? "text-red-600 hover:text-red-800"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          {studio.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
