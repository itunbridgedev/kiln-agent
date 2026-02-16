"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PunchPass {
  id: number;
  name: string;
  description: string | null;
  punchCount: number;
  price: string;
  expirationDays: number;
  isTransferable: boolean;
  isActive: boolean;
  displayOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  _count?: { customerPunchPasses: number };
}

interface StripeStatus {
  connected: boolean;
  chargesEnabled?: boolean;
}

const PUNCH_COUNTS = [1, 5, 10, 20, 50];

interface PunchPassManagerProps {
  onNavigateToStripe?: () => void;
}

export default function PunchPassManager({ onNavigateToStripe }: PunchPassManagerProps) {
  const { user } = useAuth();
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPass, setEditingPass] = useState<PunchPass | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    punchCount: 5,
    price: "",
    expirationDays: 90,
    isTransferable: false,
    displayOrder: "0",
  });

  useEffect(() => {
    if (user) {
      fetchPunchPasses();
      fetchStripeStatus();
    }
  }, [user]);

  const fetchStripeStatus = async () => {
    try {
      const response = await fetch("/api/stripe/connect/status", { credentials: "include" });
      if (response.ok) {
        setStripeStatus(await response.json());
      }
    } catch (err) {
      console.error("Error fetching Stripe status:", err);
    }
  };

  const fetchPunchPasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/punch-passes`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch punch passes");
      setPunchPasses(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!formData.name || !formData.price) {
        throw new Error("Name and price are required");
      }

      const url = editingPass
        ? `${API_BASE_URL}/api/admin/punch-passes/${editingPass.id}`
        : `${API_BASE_URL}/api/admin/punch-passes`;

      const payload = {
        name: formData.name,
        description: formData.description || null,
        punchCount: formData.punchCount,
        price: parseFloat(formData.price),
        expirationDays: formData.expirationDays,
        isTransferable: formData.isTransferable,
        displayOrder: parseInt(formData.displayOrder),
      };

      const response = await fetch(url, {
        method: editingPass ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save punch pass");
      }

      setShowForm(false);
      setEditingPass(null);
      resetForm();
      fetchPunchPasses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (pass: PunchPass) => {
    setEditingPass(pass);
    setFormData({
      name: pass.name,
      description: pass.description || "",
      punchCount: pass.punchCount,
      price: String(pass.price),
      expirationDays: pass.expirationDays,
      isTransferable: pass.isTransferable,
      displayOrder: String(pass.displayOrder),
    });
    setShowForm(true);
  };

  const handleToggleActive = async (pass: PunchPass) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/punch-passes/${pass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...pass, isActive: !pass.isActive }),
      });
      fetchPunchPasses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSyncStripe = async (passId: number) => {
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/punch-passes/${passId}/sync-stripe`,
        { method: "POST", credentials: "include" }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sync to Stripe");
      }
      fetchPunchPasses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      punchCount: 5,
      price: "",
      expirationDays: 90,
      isTransferable: false,
      displayOrder: "0",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Stripe Connect Warning */}
      {stripeStatus && !stripeStatus.connected && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-800">Stripe Connect not configured</p>
            <p className="text-sm text-yellow-700 mt-1">
              You need to connect your Stripe account before customers can purchase punch passes.
            </p>
          </div>
          {onNavigateToStripe && (
            <button
              onClick={onNavigateToStripe}
              className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium whitespace-nowrap"
            >
              Connect Stripe
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Header with button */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Punch Passes</h3>
        <button
          onClick={() => {
            resetForm();
            setEditingPass(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
        >
          {showForm ? "Cancel" : "Add Punch Pass"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-semibold mb-4 text-gray-900">
            {editingPass ? "Edit Punch Pass" : "Create New Punch Pass"}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 10 Punch Pass"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Punch Count <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.punchCount}
                  onChange={(e) =>
                    setFormData({ ...formData, punchCount: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {PUNCH_COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count} punches
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.expirationDays}
                  onChange={(e) =>
                    setFormData({ ...formData, expirationDays: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isTransferable}
                    onChange={(e) =>
                      setFormData({ ...formData, isTransferable: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-amber-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Transferable</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for customers"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPass(null);
                  resetForm();
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                {editingPass ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Punches</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Price</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Expires</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Transfers</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Purchases</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {punchPasses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No punch passes created yet. Create one to get started!
                </td>
              </tr>
            ) : (
              punchPasses.map((pass) => (
                <tr key={pass.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{pass.name}</div>
                    {pass.description && (
                      <div className="text-xs text-gray-500">{pass.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{pass.punchCount}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">${pass.price}</td>
                  <td className="px-4 py-3 text-gray-700">{pass.expirationDays} days</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        pass.isTransferable
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {pass.isTransferable ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {pass._count?.customerPunchPasses || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        pass.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {pass.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(pass)}
                        className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(pass)}
                        className={`font-medium text-sm ${
                          pass.isActive
                            ? "text-red-600 hover:text-red-700"
                            : "text-green-600 hover:text-green-700"
                        }`}
                      >
                        {pass.isActive ? "Deactivate" : "Activate"}
                      </button>
                      {pass.stripePriceId && stripeStatus?.connected && (
                        <button
                          onClick={() => handleSyncStripe(pass.id)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          Sync to Stripe
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
