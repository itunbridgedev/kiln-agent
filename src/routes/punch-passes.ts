import express, { Request, Response } from 'express';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';
import * as PunchPassService from '../services/PunchPassService';

const router = express.Router();

/**
 * GET /api/punch-passes
 * List all active punch pass products for purchase (public endpoint)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const studio = (req as any).studio;
    if (!studio) {
      return res.status(404).json({ error: 'Studio context required' });
    }

    const punchPasses = await prisma.punchPass.findMany({
      where: {
        studioId: studio.id,
        isActive: true
      },
      orderBy: [{ punchCount: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        punchCount: true,
        price: true,
        expirationDays: true,
        isTransferable: true,
        displayOrder: true,
        stripeProductId: true,
        stripePriceId: true
      }
    });

    res.json(punchPasses);
  } catch (error) {
    console.error('Error fetching punch passes:', error);
    res.status(500).json({ error: 'Failed to fetch punch passes' });
  }
});

/**
 * GET /api/punch-passes/my-passes
 * Get customer's active punch passes with remaining punches
 */
router.get('/my-passes', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const customerId = authReq.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const includeUsed = req.query.includeUsed === 'true';

    const passFilters: any = {
      customerId,
      expiresAt: { gt: now },
    };

    if (!includeUsed) {
      passFilters.punchesRemaining = { gt: 0 };
    }

    const customerPasses = await prisma.customerPunchPass.findMany({
      where: passFilters,
      include: {
        punchPass: {
          select: {
            id: true,
            name: true,
            description: true,
            punchCount: true,
            expirationDays: true,
            isTransferable: true
          }
        }
      },
      orderBy: [{ expiresAt: 'asc' }] // Show expiring soon first
    });

    res.json(
      customerPasses.map((pass) => ({
        id: pass.id,
        punchPassId: pass.punchPass.id,
        name: pass.punchPass.name,
        description: pass.punchPass.description,
        punchesRemaining: pass.punchesRemaining,
        totalPunches: pass.punchPass.punchCount,
        purchasedAt: pass.purchasedAt,
        expiresAt: pass.expiresAt,
        expiresIn: Math.ceil(
          (pass.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ), // days
        isTransferable: pass.punchPass.isTransferable
      }))
    );
  } catch (error) {
    console.error('Error fetching customer punch passes:', error);
    res.status(500).json({ error: 'Failed to fetch punch passes' });
  }
});

/**
 * POST /api/punch-passes/deduct
 * Internal endpoint: deduct one punch from a customer's pass after booking
 * Used by open studio booking system
 */
router.post('/deduct', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const customerId = authReq.user?.id;
    const { customerPunchPassId } = req.body;

    if (!customerId || !customerPunchPassId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const punchPass = await prisma.customerPunchPass.findUnique({
      where: { id: customerPunchPassId },
      select: { customerId: true, punchesRemaining: true }
    });

    if (!punchPass || punchPass.customerId !== customerId) {
      return res.status(403).json({ error: 'Punch pass not found or not owned by customer' });
    }

    if (punchPass.punchesRemaining <= 0) {
      return res.status(400).json({ error: 'No punches remaining' });
    }

    // Deduct one punch
    const updated = await prisma.customerPunchPass.update({
      where: { id: customerPunchPassId },
      data: { punchesRemaining: punchPass.punchesRemaining - 1 }
    });

    res.json({ success: true, punchesRemaining: updated.punchesRemaining });
  } catch (error) {
    console.error('Error deducting punch:', error);
    res.status(500).json({ error: 'Failed to deduct punch' });
  }
});

/**
 * POST /api/punch-passes/refund
 * Internal endpoint: refund one punch to a customer's pass after booking cancellation
 */
router.post('/refund', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const customerId = authReq.user?.id;
    const { customerPunchPassId } = req.body;

    if (!customerId || !customerPunchPassId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const punchPass = await prisma.customerPunchPass.findUnique({
      where: { id: customerPunchPassId },
      include: { punchPass: { select: { punchCount: true } } }
    });

    if (!punchPass || punchPass.customerId !== customerId) {
      return res.status(403).json({ error: 'Punch pass not found or not owned by customer' });
    }

    // Don't refund more than the original punch count
    const newCount = Math.min(punchPass.punchesRemaining + 1, punchPass.punchPass.punchCount);

    const updated = await prisma.customerPunchPass.update({
      where: { id: customerPunchPassId },
      data: { punchesRemaining: newCount }
    });

    res.json({ success: true, punchesRemaining: updated.punchesRemaining });
  } catch (error) {
    console.error('Error refunding punch:', error);
    res.status(500).json({ error: 'Failed to refund punch' });
  }
});

/**
 * POST /api/punch-passes/purchase
 * Initiate punch pass purchase via Stripe checkout
 */
router.post('/purchase', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const customerId = authReq.user?.id;
    const { punchPassId, successUrl, cancelUrl } = req.body;

    if (!customerId || !punchPassId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Missing required fields: punchPassId, successUrl, cancelUrl'
      });
    }

    const checkoutUrl = await PunchPassService.createPunchPassCheckout(
      punchPassId,
      customerId,
      successUrl,
      cancelUrl
    );

    res.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('Error initiating punch pass purchase:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate purchase' });
  }
});

export default router;
