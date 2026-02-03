import Stripe from "stripe";
import prisma from "../prisma";

// Initialize Stripe with your secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-01-28.clover",
});

// Platform application fee percentage (e.g., 5% = 0.05)
const PLATFORM_FEE_PERCENTAGE = parseFloat(
  process.env.STRIPE_PLATFORM_FEE_PERCENTAGE || "0.05"
);

/**
 * Create a Stripe Connect account for a studio
 */
export async function createConnectAccount(
  studioId: number,
  email: string,
  businessName: string,
  country: string = "US"
): Promise<string> {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "company",
      company: {
        name: businessName,
      },
    });

    // Update studio with Stripe account ID
    await prisma.studio.update({
      where: { id: studioId },
      data: {
        stripeAccountId: account.id,
        stripeAccountStatus: "pending",
      },
    });

    return account.id;
  } catch (error) {
    console.error("Error creating Connect account:", error);
    throw error;
  }
}

/**
 * Create an account link for onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return accountLink.url;
  } catch (error) {
    console.error("Error creating account link:", error);
    throw error;
  }
}

/**
 * Get Connect account details and update studio status
 */
export async function getAccountStatus(accountId: string): Promise<{
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: Stripe.Account.Requirements | null;
}> {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      detailsSubmitted: account.details_submitted || false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      requirements: account.requirements || null,
    };
  } catch (error) {
    console.error("Error fetching account status:", error);
    throw error;
  }
}

/**
 * Update studio with latest Stripe account status
 */
export async function syncStudioAccountStatus(studioId: number): Promise<void> {
  try {
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { stripeAccountId: true },
    });

    if (!studio?.stripeAccountId) {
      throw new Error("Studio does not have a Stripe account");
    }

    const status = await getAccountStatus(studio.stripeAccountId);

    let accountStatus = "pending";
    if (status.chargesEnabled && status.payoutsEnabled) {
      accountStatus = "complete";
    } else if (status.detailsSubmitted) {
      accountStatus = "pending";
    }

    await prisma.studio.update({
      where: { id: studioId },
      data: {
        stripeAccountStatus: accountStatus,
        stripeDetailsSubmitted: status.detailsSubmitted,
        stripeChargesEnabled: status.chargesEnabled,
        stripePayoutsEnabled: status.payoutsEnabled,
        ...(accountStatus === "complete" && {
          stripeOnboardedAt: new Date(),
        }),
      },
    });
  } catch (error) {
    console.error("Error syncing studio account status:", error);
    throw error;
  }
}

/**
 * Create a PaymentIntent with destination charge (Direct Charge pattern)
 * This charges the customer and transfers funds to the connected studio account
 * If studioAccountId is null, creates a direct payment (for testing without Connect)
 */
export async function createPaymentIntent(
  amount: number, // in cents
  studioAccountId: string | null,
  metadata: {
    studioId: number;
    classId: number;
    registrationId?: number;
    customerId?: number;
  }
): Promise<Stripe.PaymentIntent> {
  try {
    // If no Connect account, create direct payment (for testing)
    if (!studioAccountId) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          studioId: metadata.studioId.toString(),
          classId: metadata.classId.toString(),
          registrationId: metadata.registrationId?.toString() || "",
          customerId: metadata.customerId?.toString() || "",
        },
      });
      return paymentIntent;
    }

    // Calculate platform fee for Connect payments
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: platformFee,
      transfer_data: {
        destination: studioAccountId,
      },
      metadata: {
        studioId: metadata.studioId.toString(),
        classId: metadata.classId.toString(),
        registrationId: metadata.registrationId?.toString() || "",
        customerId: metadata.customerId?.toString() || "",
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}

/**
 * Confirm a PaymentIntent (server-side confirmation)
 */
export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error("Error confirming payment intent:", error);
    throw error;
  }
}

/**
 * Retrieve a PaymentIntent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    throw error;
  }
}

/**
 * Create a refund for a payment
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number, // Optional: partial refund amount in cents
  reason?: "duplicate" | "fraudulent" | "requested_by_customer"
): Promise<Stripe.Refund> {
  try {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason,
    };

    if (amount) {
      refundData.amount = amount;
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error("Error creating refund:", error);
    throw error;
  }
}

/**
 * Create a Connect Dashboard login link for a studio
 */
export async function createLoginLink(accountId: string): Promise<string> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error("Error creating login link:", error);
    throw error;
  }
}

/**
 * Update registration with payment information
 */
export async function updateRegistrationPayment(
  registrationId: number,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    // Retrieve full payment intent with charges
    const fullIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
      expand: ["charges"],
    });
    const charge = (fullIntent as any).charges?.data[0];
    const transfer = paymentIntent.transfer_data;

    await prisma.classRegistration.update({
      where: { id: registrationId },
      data: {
        paymentIntentId: paymentIntent.id,
        stripeChargeId: charge?.id,
        paymentStatus: "COMPLETED",
        stripeFeeAmount: paymentIntent.application_fee_amount
          ? paymentIntent.application_fee_amount / 100
          : null,
        studioPayoutAmount: transfer
          ? (paymentIntent.amount -
              (paymentIntent.application_fee_amount || 0)) /
            100
          : null,
      },
    });
  } catch (error) {
    console.error("Error updating registration payment:", error);
    throw error;
  }
}

/**
 * Handle webhook events from Stripe
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const registrationId = paymentIntent.metadata.registrationId;

        if (registrationId) {
          await updateRegistrationPayment(
            parseInt(registrationId),
            paymentIntent
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        const failedRegId = failedIntent.metadata.registrationId;

        if (failedRegId) {
          await prisma.classRegistration.update({
            where: { id: parseInt(failedRegId) },
            data: {
              paymentStatus: "FAILED",
              paymentIntentId: failedIntent.id,
            },
          });
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        // Find studio by Stripe account ID and sync status
        const studio = await prisma.studio.findUnique({
          where: { stripeAccountId: account.id },
        });

        if (studio) {
          await syncStudioAccountStatus(studio.id);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // Update registration refund status
        const registration = await prisma.classRegistration.findFirst({
          where: { stripeChargeId: charge.id },
        });

        if (registration) {
          const refund = charge.refunds?.data[0];
          await prisma.classRegistration.update({
            where: { id: registration.id },
            data: {
              paymentStatus:
                refund?.amount === charge.amount ? "REFUNDED" : "COMPLETED",
              refundAmount: refund ? refund.amount / 100 : null,
              refundedAt: refund ? new Date(refund.created * 1000) : null,
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error handling webhook event:", error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    throw error;
  }
}

export default stripe;
