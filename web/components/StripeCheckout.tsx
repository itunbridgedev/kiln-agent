"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";

interface StripeCheckoutProps {
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  amount: number;
  className?: string;
  guestCount: number;
}

export default function StripeCheckout({
  onSuccess,
  onError,
  amount,
  className,
  guestCount,
}: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error("Stripe not loaded:", {
        stripe: !!stripe,
        elements: !!elements,
      });
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    console.log("=== SUBMITTING PAYMENT ===");
    console.log("Amount:", amount);
    console.log("Guest count:", guestCount);

    try {
      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: window.location.origin + "/payment-success",
        },
      });

      console.log("=== STRIPE CONFIRM PAYMENT RESULT ===");
      console.log("Error:", error);
      console.log("PaymentIntent:", paymentIntent);

      if (error) {
        console.error("Stripe payment error:", error);
        setErrorMessage(error.message || "Payment failed");
        onError(error.message || "Payment failed");
      } else if (paymentIntent) {
        console.log("PaymentIntent status:", paymentIntent.status);
        if (paymentIntent.status === "succeeded") {
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === "requires_action") {
          setErrorMessage("Payment requires additional authentication");
          onError("Payment requires additional authentication");
        } else if (paymentIntent.status === "processing") {
          setErrorMessage("Payment is processing. Please wait.");
          onError("Payment is processing");
        } else {
          setErrorMessage(`Payment status: ${paymentIntent.status}`);
          onError(`Payment status: ${paymentIntent.status}`);
        }
      } else {
        setErrorMessage("Payment did not complete successfully");
        onError("Payment did not complete successfully");
      }
    } catch (err: any) {
      console.error("Payment exception:", err);
      setErrorMessage(err.message || "An error occurred");
      onError(err.message || "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700">
            Total ({guestCount} {guestCount === 1 ? "guest" : "guests"})
          </span>
          <span className="text-lg font-semibold text-gray-900">
            ${amount.toFixed(2)}
          </span>
        </div>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </button>

      <p className="mt-3 text-xs text-center text-gray-500">
        Payments are secure and encrypted. Test mode: use card 4242 4242 4242
        4242
      </p>
    </form>
  );
}
