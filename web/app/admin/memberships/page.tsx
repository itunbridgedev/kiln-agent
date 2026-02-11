"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Membership {
  id: number;
  name: string;
  description: string | null;
  price: string;
  billingPeriod: string;
  benefits: any;
  isActive: boolean;
  displayOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  _count: { subscriptions: number };
}

interface Subscriber {
  id: number;
  customer: { id: number; name: string; email: string };
  membership: { id: number; name: string; price: string };
  status: string;
  startDate: string;
  currentPeriodEnd: string;
}

const BILLING_PERIODS = ["MONTHLY", "QUARTERLY", "ANNUAL"];

const defaultBenefits = {
  openStudio: {
    maxBlockMinutes: 120,
    maxBookingsPerWeek: 3,
    premiumTimeAccess: false,
    advanceBookingDays: 1,
    walkInAllowed: true,
  },
  resources: { specialTools: false, specialGlazes: false },
  firings: { includedPerPeriod: 5, unlimited: false },
  discounts: { classDiscountPercent: 0, retailDiscountPercent: 0 },
};

export default function AdminMembershipsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [activeTab, setActiveTab] = useState<"tiers" | "subscribers">("tiers");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    billingPeriod: "MONTHLY",
    displayOrder: "0",
    benefits: defaultBenefits,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnTo=/admin/memberships");
    }
    if (!authLoading && user && !user.roles.includes("admin") && !user.roles.includes("manager")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchMemberships();
      fetchSubscribers();
    }
  }, [user]);

  const fetchMemberships = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/memberships`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch memberships");
      setMemberships(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/memberships/subscribers`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch subscribers");
      setSubscribers(await response.json());
    } catch (err: any) {
      console.error("Error fetching subscribers:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingMembership
        ? `${API_BASE_URL}/api/admin/memberships/${editingMembership.id}`
        : `${API_BASE_URL}/api/admin/memberships`;

      const response = await fetch(url, {
        method: editingMembership ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save membership");
      }

      setShowForm(false);
      setEditingMembership(null);
      resetForm();
      fetchMemberships();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (membership: Membership) => {
    setEditingMembership(membership);
    setFormData({
      name: membership.name,
      description: membership.description || "",
      price: membership.price,
      billingPeriod: membership.billingPeriod,
      displayOrder: String(membership.displayOrder),
      benefits: membership.benefits || defaultBenefits,
    });
    setShowForm(true);
  };

  const handleToggleActive = async (membership: Membership) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/memberships/${membership.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...membership, isActive: !membership.isActive }),
      });
      fetchMemberships();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSyncStripe = async (membershipId: number) => {
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/memberships/${membershipId}/sync-stripe`,
        { method: "POST", credentials: "include" }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sync to Stripe");
      }
      fetchMemberships();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      billingPeriod: "MONTHLY",
      displayOrder: "0",
      benefits: defaultBenefits,
    });
  };

  const updateBenefit = (section: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      benefits: {
        ...prev.benefits,
        [section]: { ...(prev.benefits as any)[section], [field]: value },
      },
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/admin")} className="text-gray-600 hover:text-gray-900">
                &larr; Back to Admin
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Memberships</h1>
                <p className="text-sm text-gray-600">Manage membership tiers and subscribers</p>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setEditingMembership(null); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + New Tier
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("tiers")}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === "tiers" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            Membership Tiers ({memberships.length})
          </button>
          <button
            onClick={() => setActiveTab("subscribers")}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === "subscribers" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            Subscribers ({subscribers.length})
          </button>
        </div>

        {/* Tiers Tab */}
        {activeTab === "tiers" && (
          <div className="grid gap-4">
            {memberships.map((m) => (
              <div key={m.id} className={`bg-white rounded-lg shadow p-6 ${!m.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{m.name}</h3>
                      {!m.isActive && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
                      )}
                      {m.stripePriceId && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Stripe</span>
                      )}
                    </div>
                    {m.description && <p className="text-gray-600 mt-1">{m.description}</p>}
                    <p className="text-2xl font-bold mt-2">
                      ${parseFloat(m.price).toFixed(2)}<span className="text-sm font-normal text-gray-500">/{m.billingPeriod.toLowerCase()}</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {m._count.subscriptions} subscriber{m._count.subscriptions !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!m.stripePriceId && (
                      <button
                        onClick={() => handleSyncStripe(m.id)}
                        className="px-3 py-1 text-sm border border-yellow-300 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                      >
                        Sync to Stripe
                      </button>
                    )}
                    <button onClick={() => handleEdit(m)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(m)}
                      className={`px-3 py-1 text-sm border rounded ${m.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}
                    >
                      {m.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
                {/* Benefits summary */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">Max Block:</span>{" "}
                    {m.benefits?.openStudio?.maxBlockMinutes || 0} min
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">Bookings/Week:</span>{" "}
                    {m.benefits?.openStudio?.maxBookingsPerWeek || 0}
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">Advance Booking:</span>{" "}
                    {m.benefits?.openStudio?.advanceBookingDays || 0} day(s)
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">Firings:</span>{" "}
                    {m.benefits?.firings?.unlimited ? "Unlimited" : `${m.benefits?.firings?.includedPerPeriod || 0}/period`}
                  </div>
                </div>
              </div>
            ))}
            {memberships.length === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No membership tiers yet. Click &quot;+ New Tier&quot; to create one.
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === "subscribers" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{s.customer.name}</div>
                      <div className="text-sm text-gray-500">{s.customer.email}</div>
                    </td>
                    <td className="px-6 py-4">{s.membership.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        s.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                        s.status === "PAST_DUE" ? "bg-yellow-100 text-yellow-700" :
                        s.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(s.currentPeriodEnd).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {subscribers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No subscribers yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingMembership ? "Edit" : "Create"} Membership Tier
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period</label>
                    <select
                      value={formData.billingPeriod}
                      onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {BILLING_PERIODS.map((p) => (
                        <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Benefits Section */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Open Studio Benefits</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Block (minutes)</label>
                      <input
                        type="number"
                        value={formData.benefits.openStudio.maxBlockMinutes}
                        onChange={(e) => updateBenefit("openStudio", "maxBlockMinutes", parseInt(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Bookings/Week</label>
                      <input
                        type="number"
                        value={formData.benefits.openStudio.maxBookingsPerWeek}
                        onChange={(e) => updateBenefit("openStudio", "maxBookingsPerWeek", parseInt(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Advance Booking (days)</label>
                      <input
                        type="number"
                        value={formData.benefits.openStudio.advanceBookingDays}
                        onChange={(e) => updateBenefit("openStudio", "advanceBookingDays", parseInt(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.benefits.openStudio.premiumTimeAccess}
                          onChange={(e) => updateBenefit("openStudio", "premiumTimeAccess", e.target.checked)}
                        />
                        Premium Time
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.benefits.openStudio.walkInAllowed}
                          onChange={(e) => updateBenefit("openStudio", "walkInAllowed", e.target.checked)}
                        />
                        Walk-In
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Resources & Firings</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.benefits.resources.specialTools}
                        onChange={(e) => updateBenefit("resources", "specialTools", e.target.checked)}
                      />
                      Special Tools Access
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.benefits.resources.specialGlazes}
                        onChange={(e) => updateBenefit("resources", "specialGlazes", e.target.checked)}
                      />
                      Special Glazes Access
                    </label>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Firings/Period</label>
                      <input
                        type="number"
                        value={formData.benefits.firings.includedPerPeriod}
                        onChange={(e) => updateBenefit("firings", "includedPerPeriod", parseInt(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm pt-4">
                      <input
                        type="checkbox"
                        checked={formData.benefits.firings.unlimited}
                        onChange={(e) => updateBenefit("firings", "unlimited", e.target.checked)}
                      />
                      Unlimited Firings
                    </label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Discounts</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Class Discount (%)</label>
                      <input
                        type="number"
                        value={formData.benefits.discounts.classDiscountPercent}
                        onChange={(e) => updateBenefit("discounts", "classDiscountPercent", parseInt(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Retail Discount (%)</label>
                      <input
                        type="number"
                        value={formData.benefits.discounts.retailDiscountPercent}
                        onChange={(e) => updateBenefit("discounts", "retailDiscountPercent", parseInt(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingMembership(null); }}
                    className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {editingMembership ? "Save Changes" : "Create Tier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
