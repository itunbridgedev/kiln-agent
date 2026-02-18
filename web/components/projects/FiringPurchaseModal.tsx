"use client";

import { useEffect, useState } from "react";

interface FiringProduct {
  id: number;
  name: string;
  firingType: string;
  price: string;
  allowMembershipBenefit: boolean;
  allowPunchPass: boolean;
}

interface SubscriptionOption {
  id: number;
  membershipName: string;
}

interface PunchPassOption {
  id: number;
  name: string;
  punchesRemaining: number;
}

interface Props {
  projectId: number;
  projectStatus: string;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

type PayMethod = "stripe" | "membership" | "punchpass";

export default function FiringPurchaseModal({
  projectId,
  projectStatus,
  onClose,
  onPurchaseComplete,
}: Props) {
  const [products, setProducts] = useState<FiringProduct[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionOption | null>(null);
  const [punchPasses, setPunchPasses] = useState<PunchPassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("stripe");
  const [selectedPunchPassId, setSelectedPunchPassId] = useState<number | null>(null);

  const expectedType = projectStatus === "CREATED" ? "BISQUE" : "GLAZE";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, subRes, passesRes] = await Promise.all([
        fetch("/api/admin/firing-products", { credentials: "include" }),
        fetch("/api/memberships/my-subscription", { credentials: "include" }),
        fetch("/api/punch-passes/my-passes", { credentials: "include" }),
      ]);

      if (productsRes.ok) {
        const allProducts = await productsRes.json();
        const filtered = allProducts.filter(
          (p: FiringProduct) => p.firingType === expectedType
        );
        setProducts(filtered);
        if (filtered.length > 0) setSelectedProductId(filtered[0].id);
      }

      if (subRes.ok) {
        const sub = await subRes.json();
        if (sub?.status === "ACTIVE") setSubscription(sub);
      }

      if (passesRes.ok) {
        setPunchPasses(await passesRes.json());
      }
    } catch (err) {
      console.error("Error loading firing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async () => {
    if (!selectedProductId) return;
    setSubmitting(true);
    setError(null);

    try {
      const body: any = {
        firingProductId: selectedProductId,
        payMethod,
      };

      if (payMethod === "stripe") {
        body.successUrl = window.location.href + "?firing=success";
        body.cancelUrl = window.location.href + "?firing=cancelled";
      } else if (payMethod === "membership" && subscription) {
        body.subscriptionId = subscription.id;
      } else if (payMethod === "punchpass" && selectedPunchPassId) {
        body.customerPunchPassId = selectedPunchPassId;
      }

      const response = await fetch(`/api/projects/${projectId}/fire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to purchase firing");
      }

      const result = await response.json();

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        onPurchaseComplete();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          Request {expectedType === "BISQUE" ? "Bisque" : "Glaze"} Firing
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {expectedType.toLowerCase()} firing products available.
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firing Type
              </label>
              <select
                value={selectedProductId || ""}
                onChange={(e) => setSelectedProductId(parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${parseFloat(p.price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payMethod"
                    value="stripe"
                    checked={payMethod === "stripe"}
                    onChange={() => setPayMethod("stripe")}
                  />
                  <div>
                    <div className="text-sm font-medium">Pay with Card</div>
                    <div className="text-xs text-gray-500">
                      ${selectedProduct ? parseFloat(selectedProduct.price).toFixed(2) : ""}
                    </div>
                  </div>
                </label>

                {subscription && selectedProduct?.allowMembershipBenefit && (
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payMethod"
                      value="membership"
                      checked={payMethod === "membership"}
                      onChange={() => setPayMethod("membership")}
                    />
                    <div>
                      <div className="text-sm font-medium">Use Membership</div>
                      <div className="text-xs text-gray-500">
                        Included in your membership
                      </div>
                    </div>
                  </label>
                )}

                {punchPasses.length > 0 && selectedProduct?.allowPunchPass && (
                  <>
                    {punchPasses.map((pass) => (
                      <label
                        key={pass.id}
                        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="payMethod"
                          value="punchpass"
                          checked={payMethod === "punchpass" && selectedPunchPassId === pass.id}
                          onChange={() => {
                            setPayMethod("punchpass");
                            setSelectedPunchPassId(pass.id);
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium">Use Punch Pass</div>
                          <div className="text-xs text-gray-500">
                            {pass.name} — {pass.punchesRemaining} punches remaining
                          </div>
                        </div>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedProductId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {submitting ? "Processing..." : "Request Firing"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
