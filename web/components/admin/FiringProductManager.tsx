"use client";

import { useCallback, useEffect, useState } from "react";

interface FiringProduct {
  id: number;
  name: string;
  description: string | null;
  firingType: string;
  price: string;
  isActive: boolean;
  allowMembershipBenefit: boolean;
  allowPunchPass: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  _count?: { firingRequests: number };
}

interface Props {
  onNavigateToStripe: () => void;
}

export default function FiringProductManager({ onNavigateToStripe }: Props) {
  const [products, setProducts] = useState<FiringProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FiringProduct | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [firingType, setFiringType] = useState("BISQUE");
  const [price, setPrice] = useState("");
  const [allowMembershipBenefit, setAllowMembershipBenefit] = useState(false);
  const [allowPunchPass, setAllowPunchPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/firing-products", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load products");
      setProducts(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStripe = useCallback(async () => {
    try {
      const response = await fetch("/api/stripe/connect/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStripeConnected(data.chargesEnabled);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    checkStripe();
  }, [fetchProducts, checkStripe]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setFiringType("BISQUE");
    setPrice("");
    setAllowMembershipBenefit(false);
    setAllowPunchPass(false);
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product: FiringProduct) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || "");
    setFiringType(product.firingType);
    setPrice(product.price);
    setAllowMembershipBenefit(product.allowMembershipBenefit);
    setAllowPunchPass(product.allowPunchPass);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        name,
        description: description || null,
        firingType,
        price: parseFloat(price),
        allowMembershipBenefit,
        allowPunchPass,
      };

      const url = editingProduct
        ? `/api/admin/firing-products/${editingProduct.id}`
        : "/api/admin/firing-products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save product");
      }

      setSuccess(editingProduct ? "Product updated" : "Product created");
      setTimeout(() => setSuccess(null), 3000);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncStripe = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/firing-products/${id}/sync-stripe`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sync failed");
      }
      setSuccess("Synced to Stripe");
      setTimeout(() => setSuccess(null), 3000);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (product: FiringProduct) => {
    try {
      const response = await fetch(`/api/admin/firing-products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!response.ok) throw new Error("Failed to update product");
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {!stripeConnected && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Stripe is not connected. You need to{" "}
            <button onClick={onNavigateToStripe} className="underline font-medium">
              connect Stripe
            </button>{" "}
            before customers can pay for firings with card.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Add Firing Product
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-3">
            {editingProduct ? "Edit" : "New"} Firing Product
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Bisque Firing"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={firingType}
                  onChange={(e) => setFiringType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="BISQUE">Bisque</option>
                  <option value="GLAZE">Glaze</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowMembershipBenefit}
                  onChange={(e) => setAllowMembershipBenefit(e.target.checked)}
                />
                Allow membership benefit
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowPunchPass}
                  onChange={(e) => setAllowPunchPass(e.target.checked)}
                />
                Allow punch pass
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {submitting ? "Saving..." : editingProduct ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Stripe</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-gray-500">{product.description}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    product.firingType === "BISQUE"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-purple-100 text-purple-800"
                  }`}>
                    {product.firingType}
                  </span>
                </td>
                <td className="px-4 py-3">${parseFloat(product.price).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {product.stripePriceId ? (
                    <span className="text-xs text-green-600">Synced</span>
                  ) : (
                    <button
                      onClick={() => handleSyncStripe(product.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Sync
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(product)}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      product.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No firing products yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
