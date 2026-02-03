import { Request, Response, Router } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../prisma";
import * as stripeService from "../services/stripe";

const router = Router();

/**
 * POST /api/stripe/payment/create-intent
 * Create a PaymentIntent for a class registration
 */
router.post("/create-intent", async (req: Request, res: Response) => {
  try {
    const {
      classId,
      sessionId: _sessionId,
      registrationType,
      guestCount = 1,
    } = req.body;
    let studioId = (req as AuthenticatedRequest).studioId;
    const user = (req as AuthenticatedRequest).user;

    // Validate required fields
    if (!classId || !registrationType) {
      return res.status(400).json({
        error: "classId and registrationType are required",
      });
    }

    // Get class details (includes studioId)
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        price: true,
        name: true,
        studioId: true,
      },
    });

    if (!classInfo) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Use studioId from class if not from tenant middleware
    if (!studioId) {
      studioId = classInfo.studioId;
    }

    if (!studioId) {
      return res.status(400).json({ error: "Studio not found" });
    }

    // Get studio's Stripe account
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        stripeAccountId: true,
        stripeChargesEnabled: true,
      },
    });

    // For testing: allow direct payments without Stripe Connect
    // In production, you would require Stripe Connect
    const useConnectAccount =
      studio?.stripeAccountId && studio.stripeChargesEnabled;

    if (!studio) {
      return res.status(400).json({ error: "Studio not found" });
    }

    // Calculate total amount (price * guest count)
    const totalAmount = parseFloat(classInfo.price.toString()) * guestCount;
    const amountInCents = Math.round(totalAmount * 100);

    // Create PaymentIntent (with or without Connect account)
    const paymentIntent = await stripeService.createPaymentIntent(
      amountInCents,
      useConnectAccount ? studio.stripeAccountId! : null,
      {
        studioId,
        classId,
        customerId: user?.id,
      }
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

/**
 * POST /api/stripe/payment/confirm
 * Confirm payment and create registration
 * This is called after the customer successfully pays on the frontend
 */
router.post("/confirm", async (req: Request, res: Response) => {
  console.log("\n=== PAYMENT CONFIRM REQUEST ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log("User:", (req as AuthenticatedRequest).user?.id);
  console.log(
    "StudioId from middleware:",
    (req as AuthenticatedRequest).studioId
  );

  try {
    const {
      paymentIntentId,
      classId,
      sessionId,
      registrationType,
      guestCount = 1,
      customerNotes,
      guestName,
      guestEmail,
      guestPhone,
    } = req.body;

    let studioId = (req as AuthenticatedRequest).studioId;
    const user = (req as AuthenticatedRequest).user;

    if (!paymentIntentId || !classId || !registrationType) {
      return res.status(400).json({
        error: "paymentIntentId, classId, and registrationType are required",
      });
    }

    // Get studioId from class if not from tenant middleware
    if (!studioId) {
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { studioId: true },
      });
      if (classInfo) {
        studioId = classInfo.studioId;
      }
    }

    if (!studioId) {
      return res.status(400).json({ error: "Studio ID not found" });
    }

    // Verify PaymentIntent succeeded
    console.log("Fetching PaymentIntent:", paymentIntentId);
    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);
    console.log("PaymentIntent status:", paymentIntent.status);
    console.log("PaymentIntent amount:", paymentIntent.amount);

    if (paymentIntent.status !== "succeeded") {
      console.error("Payment not succeeded:", paymentIntent.status);
      return res.status(400).json({
        error: "Payment has not been completed",
        status: paymentIntent.status,
      });
    }

    // Check if registration already exists for this payment
    const existingRegistration = await prisma.classRegistration.findFirst({
      where: { paymentIntentId },
    });

    if (existingRegistration) {
      return res.json({
        registrationId: existingRegistration.id,
        alreadyExists: true,
      });
    }

    // Create the registration
    const amountPaid = paymentIntent.amount / 100;
    
    // Extract charge ID from PaymentIntent
    const chargeId = typeof paymentIntent.latest_charge === 'string' 
      ? paymentIntent.latest_charge 
      : paymentIntent.latest_charge?.id;

    console.log("Creating registration with data:", {
      studioId,
      customerId: user?.id,
      classId,
      registrationType,
      guestCount,
      amountPaid,
      guestName,
      guestEmail,
      sessionId,
      chargeId,
    });

    const registration = await prisma.classRegistration.create({
      data: {
        studioId,
        customerId: user?.id,
        classId,
        registrationType,
        registrationStatus: "CONFIRMED",
        guestCount,
        amountPaid,
        paymentStatus: "COMPLETED",
        paymentIntentId,
        stripeChargeId: chargeId,
        customerNotes,
        guestName,
        guestEmail,
        guestPhone,
        confirmedAt: new Date(),
      },
    });

    console.log("Registration created:", registration.id);

    // If single session, link to specific session
    if (registrationType === "SINGLE_SESSION" && sessionId) {
      const sessionLinkData = {
        registrationId: registration.id,
        sessionId,
      };
      console.log("About to create RegistrationSession with data:", JSON.stringify(sessionLinkData, null, 2));
      await prisma.registrationSession.create({
        data: sessionLinkData,
      });
      console.log("RegistrationSession created successfully");
    }

    // Update payment details from PaymentIntent
    await stripeService.updateRegistrationPayment(
      registration.id,
      paymentIntent
    );

    console.log("=== PAYMENT CONFIRMED SUCCESSFULLY ===");
    console.log("Registration ID:", registration.id);

    res.json({
      registrationId: registration.id,
      success: true,
    });
  } catch (error: any) {
    console.error("\n=== ERROR CONFIRMING PAYMENT ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Full error:", error);
    res
      .status(500)
      .json({ error: "Failed to confirm payment", details: error?.message });
  }
});

/**
 * POST /api/stripe/payment/refund
 * Create a refund for a registration
 * Requires: Admin role
 */
router.post("/refund", async (req: Request, res: Response) => {
  try {
    const { registrationId, amount, reason } = req.body;
    const studioId = (req as AuthenticatedRequest).studioId;
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const isAdmin = user.roles?.some((role) => role.role.name === "ADMIN");
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (!registrationId) {
      return res.status(400).json({ error: "registrationId is required" });
    }

    // Get registration
    const registration = await prisma.classRegistration.findFirst({
      where: {
        id: registrationId,
        studioId,
      },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    if (!registration.paymentIntentId) {
      return res.status(400).json({ error: "No payment to refund" });
    }

    // Create refund
    const amountInCents = amount ? Math.round(amount * 100) : undefined;
    const refund = await stripeService.createRefund(
      registration.paymentIntentId,
      amountInCents,
      reason
    );

    // Update registration
    await prisma.classRegistration.update({
      where: { id: registrationId },
      data: {
        paymentStatus:
          refund.amount === registration.amountPaid.toNumber() * 100
            ? "REFUNDED"
            : "COMPLETED",
        refundAmount: refund.amount / 100,
        refundedAt: new Date(),
        registrationStatus: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
    res.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
    });
  } catch (error) {
    console.error("Error creating refund:", error);
    res.status(500).json({ error: "Failed to create refund" });
  }
});

export default router;
