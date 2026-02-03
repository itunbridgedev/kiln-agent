"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useEffect, useState } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

function CheckoutForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(undefined);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message);
      onError(error.message || "Payment failed");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-lg font-semibold text-gray-900">
          Total: ${amount.toFixed(2)}
        </p>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

interface StripeCheckoutProps {
  classId: number;
  sessionId?: number;
  registrationType: string;
  guestCount?: number;
  onSuccess: (registrationId: number) => void;
  onCancel: () => void;
}

export default function StripeCheckout({
  classId,
  sessionId,
  registrationType,
  guestCount = 1,
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [paymentIntentId, setPaymentIntentId] = useState<string>();
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    // Create PaymentIntent
    fetch("/api/stripe/payment/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        classId,
        sessionId,
        registrationType,
        guestCount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId);
          setAmount(data.amount);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to initialize payment");
        setLoading(false);
      });
  }, [classId, sessionId, registrationType, guestCount]);

  const handlePaymentSuccess = async (confirmedPaymentIntentId: string) => {
    try {
      // Confirm registration on backend
      const response = await fetch("/api/stripe/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentIntentId: confirmedPaymentIntentId,
          classId,
          sessionId,
          registrationType,
          guestCount,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        onSuccess(data.registrationId);
      }
    } catch (err) {
      setError("Failed to confirm registration");
    }
  };

  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={onCancel}
          className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#2563eb",
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm
          clientSecret={clientSecret}
          amount={amount}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </Elements>
    </div>
  );
}
