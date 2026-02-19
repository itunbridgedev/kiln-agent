import { FiringType, ProjectStatus } from "@prisma/client";
import prisma from "../prisma";
import * as ProjectService from "./ProjectService";
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
  payMethod: "stripe" | "membership",
  options: {
    successUrl?: string;
    cancelUrl?: string;
    subscriptionId?: number;
  }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, customerId },
  });
  if (!project) throw new Error("Project not found");

  // Check project is in a valid state for firing
  const validStatuses: ProjectStatus[] = [
    ProjectStatus.CREATED,
    ProjectStatus.BISQUE_DONE,
    ProjectStatus.PICKUP_READY,
    ProjectStatus.PICKED_UP,
  ];
  if (!validStatuses.includes(project.status)) {
    throw new Error(
      `Project must be in CREATED, BISQUE_DONE, PICKUP_READY, or PICKED_UP status to request firing`
    );
  }

  // Prevent duplicate firing requests — check if there's already an active (uncompleted) firing
  const activeFiring = await prisma.firingRequest.findFirst({
    where: { projectId, completedAt: null },
  });
  if (activeFiring) {
    throw new Error("A firing request is already in progress for this project");
  }

  const firingProduct = await prisma.firingProduct.findUnique({
    where: { id: firingProductId },
    include: { studio: { select: { stripeAccountId: true } } },
  });
  if (!firingProduct || !firingProduct.isActive) {
    throw new Error("Firing product not found or inactive");
  }

  // Determine expected firing type based on project status
  // CREATED → bisque, BISQUE_DONE → glaze, PICKUP_READY/PICKED_UP → either (re-fire)
  const expectedType =
    project.status === ProjectStatus.CREATED
      ? FiringType.BISQUE
      : project.status === ProjectStatus.BISQUE_DONE
        ? FiringType.GLAZE
        : firingProduct.firingType; // re-fire allows any type
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

    // Advance project status to docking
    const dockStatus =
      firingProduct.firingType === FiringType.BISQUE
        ? ProjectStatus.DOCK_BISQUE
        : ProjectStatus.DOCK_GLAZE;
    await ProjectService.updateProjectStatus(
      projectId,
      dockStatus,
      customerId,
      `Firing requested (membership)`
    );

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

  // Advance project status to docking
  const dockStatus =
    firingProduct.firingType === FiringType.BISQUE
      ? ProjectStatus.DOCK_BISQUE
      : ProjectStatus.DOCK_GLAZE;
  await ProjectService.updateProjectStatus(
    projectId,
    dockStatus,
    customerId,
    `Firing requested (Stripe payment)`
  );

  console.log(`Successfully created firing request: ${firing.id}`);
  return firing;
}
