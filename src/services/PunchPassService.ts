import prisma from '../prisma';
import stripe from './stripe';

/**
 * Create a Stripe checkout session for punch pass purchase
 */
export async function createPunchPassCheckout(
  punchPassId: number,
  customerId: number,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const punchPass = await prisma.punchPass.findUnique({
    where: { id: punchPassId },
    include: { studio: { select: { id: true, stripeAccountId: true } } }
  });

  if (!punchPass) {
    throw new Error('Punch pass not found');
  }

  if (!punchPass.isActive) {
    throw new Error('This punch pass is no longer available');
  }

  if (!punchPass.studio.stripeAccountId) {
    throw new Error('Studio has no Stripe account connected. Connect Stripe first in Settings.');
  }

  if (!punchPass.stripePriceId) {
    throw new Error('Punch pass has no Stripe price configured. Sync to Stripe first.');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true }
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{ price: punchPass.stripePriceId, quantity: 1 }],
      customer_email: customer.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        punchPassId: punchPassId.toString(),
        customerId: customerId.toString(),
        studioId: punchPass.studioId.toString()
      }
    },
    { stripeAccount: punchPass.studio.stripeAccountId }
  );

  if (!session.url) {
    throw new Error('Failed to create checkout session');
  }

  return session.url;
}

/**
 * Handle a completed punch pass purchase from Stripe webhook
 */
export async function handlePunchPassPurchase(
  stripeSessionId: string,
  stripeAccountId: string
) {
  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {}, { stripeAccount: stripeAccountId });

    // Only process if payment was successful
    if (session.payment_status !== 'paid') {
      console.log(`Payment not completed for session ${stripeSessionId}`);
      return;
    }

    // Check if this has already been processed
    const existingPurchase = await prisma.customerPunchPass.findFirst({
      where: { stripeCheckoutSessionId: stripeSessionId }
    });

    if (existingPurchase) {
      console.log(`Purchase already processed for session ${stripeSessionId}`);
      return;
    }

    const metadata = session.metadata;
    const punchPassId = parseInt(metadata?.punchPassId || '0');
    const customerId = parseInt(metadata?.customerId || '0');
    const studioId = parseInt(metadata?.studioId || '0');

    if (!punchPassId || !customerId || !studioId) {
      throw new Error(`Invalid metadata in Stripe session: ${stripeSessionId}`);
    }

    // Get the punch pass to find expiration days
    const punchPass = await prisma.punchPass.findUnique({
      where: { id: punchPassId }
    });

    if (!punchPass) {
      throw new Error(`Punch pass ${punchPassId} not found`);
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + punchPass.expirationDays);

    // Create the customer punch pass record
    const customerPunchPass = await prisma.customerPunchPass.create({
      data: {
        customerId,
        punchPassId,
        studioId,
        punchesRemaining: punchPass.punchCount,
        purchasedAt: new Date(),
        expiresAt,
        stripeCheckoutSessionId: stripeSessionId,
        stripePaymentIntentId: session.payment_intent?.toString()
      }
    });

    console.log(`Successfully created customer punch pass: ${customerPunchPass.id}`);
    return customerPunchPass;
  } catch (error) {
    console.error(`Error processing punch pass purchase for session ${stripeSessionId}:`, error);
    throw error;
  }
}

/**
 * Get a customer's active punch passes
 */
export async function getCustomerActivePunchPasses(customerId: number, studioId: number) {
  const now = new Date();
  
  return prisma.customerPunchPass.findMany({
    where: {
      customerId,
      studioId,
      expiresAt: { gt: now },
      punchesRemaining: { gt: 0 }
    },
    include: {
      punchPass: {
        select: {
          id: true,
          name: true,
          description: true,
          punchCount: true,
          isTransferable: true
        }
      }
    },
    orderBy: { expiresAt: 'asc' }
  });
}
