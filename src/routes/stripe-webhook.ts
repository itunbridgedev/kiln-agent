import { Request, Response, Router } from "express";
import Stripe from "stripe";
import * as stripeService from "../services/stripe";

const router = Router();

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 * This endpoint must use raw body for signature verification
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      // Construct and verify the event
      event = stripeService.constructWebhookEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Handle the event
    await stripeService.handleWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default router;
