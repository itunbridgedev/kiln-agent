"use client";

import StripeConnectOnboarding from "@/components/stripe/StripeConnectOnboarding";

export default function StripeConnectSettings() {
  return (
    <div className="max-w-4xl space-y-8">
      <StripeConnectOnboarding />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Payment Information
        </h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              How Payments Work
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Customers pay for classes directly through your booking pages</li>
              <li>Payments are processed securely through Stripe</li>
              <li>A 5% platform fee is automatically deducted</li>
              <li>Remaining funds are deposited to your bank account</li>
              <li>Payouts occur according to your Stripe payout schedule</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Platform Fee Breakdown
            </h3>
            <div className="bg-gray-50 rounded p-4 font-mono text-sm">
              <div className="flex justify-between mb-1">
                <span>Class Price:</span>
                <span>$100.00</span>
              </div>
              <div className="flex justify-between mb-1 text-red-600">
                <span>Platform Fee (5%):</span>
                <span>- $5.00</span>
              </div>
              <div className="border-t border-gray-300 my-2"></div>
              <div className="flex justify-between font-bold">
                <span>Your Payout:</span>
                <span className="text-green-600">$95.00</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Payment Methods Accepted
            </h3>
            <div className="flex gap-4 items-center">
              <div className="text-2xl">💳</div>
              <span>Visa, Mastercard, American Express, Discover</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Security & Compliance
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>PCI DSS Level 1 certified through Stripe</li>
              <li>All transactions encrypted with SSL/TLS</li>
              <li>No card details stored on our servers</li>
              <li>3D Secure authentication supported</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-blue-700 mb-4">
          If you have questions about payment processing or need assistance
          with your Stripe account:
        </p>
        <ul className="list-disc list-inside text-blue-700 space-y-1">
          <li>
            Visit{" "}
            <a
              href="https://support.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-900"
            >
              Stripe Support
            </a>
          </li>
          <li>
            Check{" "}
            <a
              href="https://status.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-900"
            >
              Stripe Status
            </a>{" "}
            for service updates
          </li>
          <li>Contact our support team for platform-specific issues</li>
        </ul>
      </div>
    </div>
  );
}
