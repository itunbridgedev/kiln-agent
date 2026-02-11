import { BillingPeriod, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import prisma from "../prisma";
import stripe from "./stripe";

/**
 * Extract current_period_start from a Stripe subscription.
 * In newer Stripe API versions, period info is on items, not the subscription root.
 */
function getSubscriptionPeriodStart(sub: Stripe.Subscription): number {
  const firstItem = sub.items?.data?.[0];
  if (firstItem?.current_period_start) {
    return firstItem.current_period_start;
  }
  // Fallback: use start_date
  return sub.start_date;
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): number {
  const firstItem = sub.items?.data?.[0];
  if (firstItem?.current_period_end) {
    return firstItem.current_period_end;
  }
  // Fallback: estimate based on start_date + 30 days
  return sub.start_date + 30 * 24 * 60 * 60;
}

/**
 * Extract subscription ID from an invoice.
 * In newer Stripe API, subscription is in parent.subscription_details.
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent as any;
  if (parent?.subscription_details?.subscription) {
    const sub = parent.subscription_details.subscription;
    return typeof sub === "string" ? sub : sub?.id || null;
  }
  return null;
}

// Benefits JSON structure
export interface MembershipBenefits {
  openStudio: {
    maxBlockMinutes: number;
    maxBookingsPerWeek: number;
    premiumTimeAccess: boolean;
    advanceBookingDays: number;
    walkInAllowed: boolean;
  };
  resources: {
    specialTools: boolean;
    specialGlazes: boolean;
  };
  firings: {
    includedPerPeriod: number;
    unlimited: boolean;
  };
  discounts: {
    classDiscountPercent: number;
    retailDiscountPercent: number;
  };
}

export const DEFAULT_BENEFITS: MembershipBenefits = {
  openStudio: {
    maxBlockMinutes: 120,
    maxBookingsPerWeek: 3,
    premiumTimeAccess: false,
    advanceBookingDays: 1,
    walkInAllowed: true,
  },
  resources: {
    specialTools: false,
    specialGlazes: false,
  },
  firings: {
    includedPerPeriod: 5,
    unlimited: false,
  },
  discounts: {
    classDiscountPercent: 0,
    retailDiscountPercent: 0,
  },
};

function billingPeriodToStripeInterval(
  period: BillingPeriod
): { interval: "month" | "year"; interval_count: number } {
  switch (period) {
    case "MONTHLY":
      return { interval: "month", interval_count: 1 };
    case "QUARTERLY":
      return { interval: "month", interval_count: 3 };
    case "ANNUAL":
      return { interval: "year", interval_count: 1 };
  }
}

/**
 * Create a Stripe Product and Price for a membership tier
 */
export async function createStripeProductAndPrice(
  membershipId: number,
  name: string,
  description: string | null,
  priceInCents: number,
  billingPeriod: BillingPeriod,
  stripeAccountId: string
): Promise<{ productId: string; priceId: string }> {
  const product = await stripe.products.create(
    {
      name,
      description: description || undefined,
      metadata: { membershipId: membershipId.toString() },
    },
    { stripeAccount: stripeAccountId }
  );

  const { interval, interval_count } =
    billingPeriodToStripeInterval(billingPeriod);

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: priceInCents,
      currency: "usd",
      recurring: { interval, interval_count },
    },
    { stripeAccount: stripeAccountId }
  );

  return { productId: product.id, priceId: price.id };
}

/**
 * Create a membership tier
 */
export async function createMembership(data: {
  studioId: number;
  name: string;
  description?: string;
  price: number;
  billingPeriod: BillingPeriod;
  benefits?: MembershipBenefits;
  displayOrder?: number;
}) {
  const studio = await prisma.studio.findUnique({
    where: { id: data.studioId },
    select: { stripeAccountId: true },
  });

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  // Create Stripe product/price on the connected account if available
  if (studio?.stripeAccountId) {
    const priceInCents = Math.round(data.price * 100);
    const result = await createStripeProductAndPrice(
      0, // will update after creation
      data.name,
      data.description || null,
      priceInCents,
      data.billingPeriod,
      studio.stripeAccountId
    );
    stripeProductId = result.productId;
    stripePriceId = result.priceId;
  }

  const membership = await prisma.membership.create({
    data: {
      studioId: data.studioId,
      name: data.name,
      description: data.description,
      price: data.price,
      billingPeriod: data.billingPeriod,
      benefits: (data.benefits || DEFAULT_BENEFITS) as any,
      displayOrder: data.displayOrder || 0,
      stripeProductId,
      stripePriceId,
    },
  });

  // Update Stripe product metadata with the actual membership ID
  if (studio?.stripeAccountId && stripeProductId) {
    await stripe.products.update(
      stripeProductId,
      { metadata: { membershipId: membership.id.toString() } },
      { stripeAccount: studio.stripeAccountId }
    );
  }

  return membership;
}

/**
 * Update a membership tier
 */
export async function updateMembership(
  membershipId: number,
  data: {
    name?: string;
    description?: string;
    price?: number;
    billingPeriod?: BillingPeriod;
    benefits?: MembershipBenefits;
    isActive?: boolean;
    displayOrder?: number;
  }
) {
  const membership = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      ...data,
      benefits: data.benefits ? (data.benefits as any) : undefined,
    },
  });

  return membership;
}

/**
 * Get all membership tiers for a studio
 */
export async function getMemberships(studioId: number) {
  return prisma.membership.findMany({
    where: { studioId, isActive: true },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: { select: { subscriptions: true } },
    },
  });
}

/**
 * Get all memberships including inactive (for admin)
 */
export async function getAllMemberships(studioId: number) {
  return prisma.membership.findMany({
    where: { studioId },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: { select: { subscriptions: true } },
    },
  });
}

/**
 * Create a Stripe Checkout Session for a membership subscription
 */
export async function createSubscriptionCheckout(
  membershipId: number,
  customerId: number,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { studio: { select: { stripeAccountId: true } } },
  });

  if (!membership) {
    throw new Error("Membership not found");
  }

  if (!membership.stripePriceId) {
    throw new Error("Membership has no Stripe price configured");
  }

  if (!membership.studio.stripeAccountId) {
    throw new Error("Studio has no Stripe account configured");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: membership.stripePriceId, quantity: 1 }],
      customer_email: customer.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        membershipId: membershipId.toString(),
        customerId: customerId.toString(),
        studioId: membership.studioId.toString(),
      },
      subscription_data: {
        metadata: {
          membershipId: membershipId.toString(),
          customerId: customerId.toString(),
          studioId: membership.studioId.toString(),
        },
      },
    },
    { stripeAccount: membership.studio.stripeAccountId }
  );

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

/**
 * Handle a new subscription from Stripe webhook
 */
export async function handleSubscriptionCreated(
  stripeSubscription: Stripe.Subscription,
  stripeAccountId: string
) {
  const metadata = stripeSubscription.metadata;
  const membershipId = parseInt(metadata.membershipId);
  const customerId = parseInt(metadata.customerId);
  const studioId = parseInt(metadata.studioId);

  if (!membershipId || !customerId || !studioId) {
    console.error(
      "Missing metadata on subscription:",
      stripeSubscription.id
    );
    return;
  }

  // Check if subscription already exists
  const existing = await prisma.membershipSubscription.findFirst({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (existing) {
    return existing;
  }

  const subscription = await prisma.membershipSubscription.create({
    data: {
      studioId,
      customerId,
      membershipId,
      status: "ACTIVE",
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId:
        typeof stripeSubscription.customer === "string"
          ? stripeSubscription.customer
          : stripeSubscription.customer?.id,
      startDate: new Date(stripeSubscription.start_date * 1000),
      currentPeriodStart: new Date(
        getSubscriptionPeriodStart(stripeSubscription) * 1000
      ),
      currentPeriodEnd: new Date(
        getSubscriptionPeriodEnd(stripeSubscription) * 1000
      ),
    },
  });

  return subscription;
}

/**
 * Handle subscription updates from Stripe webhook
 */
export async function handleSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription
) {
  const existing = await prisma.membershipSubscription.findFirst({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!existing) {
    console.error(
      "Subscription not found for update:",
      stripeSubscription.id
    );
    return;
  }

  let status: SubscriptionStatus = "ACTIVE";
  switch (stripeSubscription.status) {
    case "active":
      status = "ACTIVE";
      break;
    case "past_due":
      status = "PAST_DUE";
      break;
    case "canceled":
      status = "CANCELLED";
      break;
    case "unpaid":
      status = "PAST_DUE";
      break;
    case "paused":
      status = "PAUSED";
      break;
    default:
      status = "ACTIVE";
  }

  return prisma.membershipSubscription.update({
    where: { id: existing.id },
    data: {
      status,
      currentPeriodStart: new Date(
        getSubscriptionPeriodStart(stripeSubscription) * 1000
      ),
      currentPeriodEnd: new Date(
        getSubscriptionPeriodEnd(stripeSubscription) * 1000
      ),
      cancelledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
      cancellationReason:
        stripeSubscription.cancellation_details?.reason || null,
    },
  });
}

/**
 * Handle subscription deletion from Stripe webhook
 */
export async function handleSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription
) {
  const existing = await prisma.membershipSubscription.findFirst({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!existing) {
    return;
  }

  return prisma.membershipSubscription.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}

/**
 * Handle failed invoice payment
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
) {
  // In newer Stripe API versions, subscription is accessed via parent.subscription_details
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) return;

  const existing = await prisma.membershipSubscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!existing) return;

  return prisma.membershipSubscription.update({
    where: { id: existing.id },
    data: { status: "PAST_DUE" },
  });
}

/**
 * Cancel a subscription (request cancellation at period end)
 */
export async function cancelSubscription(
  subscriptionId: number,
  reason?: string
) {
  const subscription = await prisma.membershipSubscription.findUnique({
    where: { id: subscriptionId },
    include: { membership: { include: { studio: true } } },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // Cancel on Stripe if connected
  if (
    subscription.stripeSubscriptionId &&
    subscription.membership.studio.stripeAccountId
  ) {
    await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true },
      {
        stripeAccount: subscription.membership.studio.stripeAccountId,
      }
    );
  }

  return prisma.membershipSubscription.update({
    where: { id: subscriptionId },
    data: {
      cancelledAt: new Date(),
      cancellationReason: reason,
    },
  });
}

/**
 * Get a customer's active subscription
 */
export async function getActiveSubscription(
  customerId: number,
  studioId: number
) {
  return prisma.membershipSubscription.findFirst({
    where: {
      customerId,
      studioId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    include: {
      membership: true,
    },
  });
}

/**
 * Get all subscriptions for a studio (admin view)
 */
export async function getStudioSubscriptions(
  studioId: number,
  status?: SubscriptionStatus
) {
  return prisma.membershipSubscription.findMany({
    where: {
      studioId,
      ...(status && { status }),
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      membership: { select: { id: true, name: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a Stripe Customer Portal session for self-service management
 */
export async function createCustomerPortalSession(
  subscriptionId: number,
  returnUrl: string
): Promise<string> {
  const subscription = await prisma.membershipSubscription.findUnique({
    where: { id: subscriptionId },
    include: { membership: { include: { studio: true } } },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (
    !subscription.stripeCustomerId ||
    !subscription.membership.studio.stripeAccountId
  ) {
    throw new Error("Stripe not configured for this subscription");
  }

  const session = await stripe.billingPortal.sessions.create(
    {
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    },
    {
      stripeAccount: subscription.membership.studio.stripeAccountId,
    }
  );

  return session.url;
}
