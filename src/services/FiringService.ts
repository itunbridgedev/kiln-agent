import { FiringType, ProjectStatus } from "@prisma/client";
import prisma from "../prisma";
import stripe from "./stripe";

// --- Firing Product CRUD ---

export async function createFiringProduct(
  studioId: number,
  data: {
    name: string;
    description?: string;
    firingType: FiringType;
    price: number;
    allowMembershipBenefit?: boolean;
    allowPunchPass?: boolean;
  }
) {
  return prisma.firingProduct.create({
    data: {
      studioId,
      name: data.name,
      description: data.description,
      firingType: data.firingType,
      price: data.price,
      allowMembershipBenefit: data.allowMembershipBenefit || false,
      allowPunchPass: data.allowPunchPass || false,
    },
  });
}

export async function updateFiringProduct(
  id: number,
  data: {
    name?: string;
    description?: string;
    firingType?: FiringType;
    price?: number;
    isActive?: boolean;
    allowMembershipBenefit?: boolean;
    allowPunchPass?: boolean;
  }
) {
  return prisma.firingProduct.update({
    where: { id },
    data,
  });
}

export async function getFiringProducts() {
  return prisma.firingProduct.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { firingRequests: true } } },
  });
}

export async function syncFiringProductToStripe(id: number) {
  const product = await prisma.firingProduct.findUnique({
    where: { id },
    include: { studio: { select: { stripeAccountId: true } } },
  });

  if (!product) throw new Error("Firing product not found");
  if (!product.studio.stripeAccountId) {
    throw new Error("Studio has no Stripe account connected");
  }

  const stripeAccount = product.studio.stripeAccountId;

  let stripeProductId = product.stripeProductId;

  if (!stripeProductId) {
    const stripeProduct = await stripe.products.create(
      {
        name: product.name,
        description: product.description || undefined,
        metadata: { firingProductId: id.toString() },
      },
      { stripeAccount }
    );
    stripeProductId = stripeProduct.id;
  } else {
    await stripe.products.update(
      stripeProductId,
      {
        name: product.name,
        description: product.description || undefined,
      },
      { stripeAccount }
    );
  }

  // Archive old price if exists, create new one
  if (product.stripePriceId) {
    await stripe.prices.update(
      product.stripePriceId,
      { active: false },
      { stripeAccount }
    );
  }

  const stripePrice = await stripe.prices.create(
    {
      product: stripeProductId,
      unit_amount: Math.round(Number(product.price) * 100),
      currency: "usd",
    },
    { stripeAccount }
  );

  return prisma.firingProduct.update({
    where: { id },
    data: {
      stripeProductId,
      stripePriceId: stripePrice.id,
    },
  });
}

// --- Firing Purchase ---

export async function purchaseFiring(
  projectId: number,
  firingProductId: number,
  customerId: number,
  payMethod: "stripe" | "membership" | "punchpass",
  options: {
    successUrl?: string;
    cancelUrl?: string;
    subscriptionId?: number;
    customerPunchPassId?: number;
  }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, customerId },
  });
  if (!project) throw new Error("Project not found");

  // Check project is in a valid state for firing
  const validStatuses: ProjectStatus[] = [ProjectStatus.CREATED, ProjectStatus.BISQUE_DONE];
  if (!validStatuses.includes(project.status)) {
    throw new Error(
      `Project must be in CREATED or BISQUE_DONE status to request firing`
    );
  }

  const firingProduct = await prisma.firingProduct.findUnique({
    where: { id: firingProductId },
    include: { studio: { select: { stripeAccountId: true } } },
  });
  if (!firingProduct || !firingProduct.isActive) {
    throw new Error("Firing product not found or inactive");
  }

  // Determine expected firing type based on project status
  const expectedType =
    project.status === ProjectStatus.CREATED
      ? FiringType.BISQUE
      : FiringType.GLAZE;
  if (firingProduct.firingType !== expectedType) {
    throw new Error(
      `Expected ${expectedType} firing for project in ${project.status} status`
    );
  }

  if (payMethod === "stripe") {
    if (!firingProduct.studio.stripeAccountId) {
      throw new Error("Studio has no Stripe account connected");
    }
    if (!firingProduct.stripePriceId) {
      throw new Error("Firing product not synced to Stripe");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true },
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ price: firingProduct.stripePriceId, quantity: 1 }],
        customer_email: customer!.email,
        success_url: options.successUrl || "",
        cancel_url: options.cancelUrl || "",
        metadata: {
          type: "firing_purchase",
          projectId: projectId.toString(),
          firingProductId: firingProductId.toString(),
          customerId: customerId.toString(),
          studioId: project.studioId.toString(),
        },
      },
      { stripeAccount: firingProduct.studio.stripeAccountId }
    );

    return { checkoutUrl: session.url };
  }

  if (payMethod === "membership") {
    if (!firingProduct.allowMembershipBenefit) {
      throw new Error("This firing product does not accept membership benefit");
    }
    if (!options.subscriptionId) {
      throw new Error("Subscription ID required for membership payment");
    }

    const subscription = await prisma.membershipSubscription.findFirst({
      where: { id: options.subscriptionId, customerId, status: "ACTIVE" },
    });
    if (!subscription) throw new Error("Active subscription not found");

    const firing = await prisma.firingRequest.create({
      data: {
        studioId: project.studioId,
        projectId,
        firingProductId,
        firingType: firingProduct.firingType,
        subscriptionId: options.subscriptionId,
        paidAt: new Date(),
      },
    });

    return { firing };
  }

  if (payMethod === "punchpass") {
    if (!firingProduct.allowPunchPass) {
      throw new Error("This firing product does not accept punch passes");
    }
    if (!options.customerPunchPassId) {
      throw new Error("Punch pass ID required");
    }

    const punchPass = await prisma.customerPunchPass.findFirst({
      where: {
        id: options.customerPunchPassId,
        customerId,
        punchesRemaining: { gt: 0 },
        expiresAt: { gt: new Date() },
      },
    });
    if (!punchPass) throw new Error("Valid punch pass not found");

    const [firing] = await prisma.$transaction([
      prisma.firingRequest.create({
        data: {
          studioId: project.studioId,
          projectId,
          firingProductId,
          firingType: firingProduct.firingType,
          customerPunchPassId: options.customerPunchPassId,
          paidAt: new Date(),
        },
      }),
      prisma.customerPunchPass.update({
        where: { id: options.customerPunchPassId },
        data: { punchesRemaining: { decrement: 1 } },
      }),
    ]);

    return { firing };
  }

  throw new Error("Invalid payment method");
}

export async function handleFiringPurchaseWebhook(
  stripeSessionId: string,
  stripeAccountId: string
) {
  const session = await stripe.checkout.sessions.retrieve(
    stripeSessionId,
    {},
    { stripeAccount: stripeAccountId }
  );

  if (session.payment_status !== "paid") {
    console.log(`Payment not completed for firing session ${stripeSessionId}`);
    return;
  }

  // Check if already processed
  const existing = await prisma.firingRequest.findFirst({
    where: { stripeCheckoutSessionId: stripeSessionId },
  });
  if (existing) {
    console.log(`Firing purchase already processed: ${stripeSessionId}`);
    return;
  }

  const metadata = session.metadata;
  const projectId = parseInt(metadata?.projectId || "0");
  const firingProductId = parseInt(metadata?.firingProductId || "0");
  const customerId = parseInt(metadata?.customerId || "0");
  const studioId = parseInt(metadata?.studioId || "0");

  if (!projectId || !firingProductId || !customerId || !studioId) {
    throw new Error(`Invalid metadata in firing session: ${stripeSessionId}`);
  }

  const firingProduct = await prisma.firingProduct.findUnique({
    where: { id: firingProductId },
  });
  if (!firingProduct) throw new Error(`Firing product ${firingProductId} not found`);

  const firing = await prisma.firingRequest.create({
    data: {
      studioId,
      projectId,
      firingProductId,
      firingType: firingProduct.firingType,
      stripePaymentIntentId: session.payment_intent?.toString(),
      stripeCheckoutSessionId: stripeSessionId,
      paidAt: new Date(),
    },
  });

  console.log(`Successfully created firing request: ${firing.id}`);
  return firing;
}
