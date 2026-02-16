import express, { Request, Response } from 'express';
import { isAuthenticated, isAdmin, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = express.Router();

// Require authentication and admin access for all routes
router.use(isAuthenticated, isAdmin);

/**
 * GET /api/admin/punch-passes
 * List all punch passes for this studio (admin only)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const hostHeader = req.get('host') || '';
    const studioSubdomain = hostHeader.split('.')[0];

    const studio = await prisma.studio.findUnique({
      where: { subdomain: studioSubdomain },
      select: { id: true }
    });

    if (!studio) {
      return res.status(404).json({ error: 'Studio not found' });
    }

    const punchPasses = await prisma.punchPass.findMany({
      where: { studioId: studio.id },
      orderBy: [{ punchCount: 'asc' }],
      include: {
        _count: {
          select: { customerPasses: true }
        }
      }
    });

    res.json(
      punchPasses.map((p) => ({
        ...p,
        customerCount: p._count.customerPasses
      }))
    );
  } catch (error) {
    console.error('Error fetching punch passes:', error);
    res.status(500).json({ error: 'Failed to fetch punch passes' });
  }
});

/**
 * POST /api/admin/punch-passes
 * Create a new punch pass (admin only)
 */
router.post('/', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { name, description, punchCount, price, expirationDays, isTransferable, displayOrder } = req.body;

    const hostHeader = req.get('host') || '';
    const studioSubdomain = hostHeader.split('.')[0];

    const studio = await prisma.studio.findUnique({
      where: { subdomain: studioSubdomain },
      select: { id: true }
    });

    if (!studio) {
      return res.status(404).json({ error: 'Studio not found' });
    }

    // Validate required fields
    if (!name || !punchCount || !price || !expirationDays) {
      return res.status(400).json({
        error: 'Missing required fields: name, punchCount, price, expirationDays'
      });
    }

    // Check if punch pass already exists
    const existing = await prisma.punchPass.findFirst({
      where: { studioId: studio.id, punchCount }
    });

    if (existing) {
      return res.status(409).json({
        error: `Punch pass with ${punchCount} punches already exists for this studio`
      });
    }

    const punchPass = await prisma.punchPass.create({
      data: {
        studioId: studio.id,
        name,
        description: description || null,
        punchCount: parseInt(punchCount),
        price: parseFloat(price),
        expirationDays: parseInt(expirationDays),
        isTransferable: isTransferable ?? false,
        displayOrder: displayOrder ?? 0
      }
    });

    res.status(201).json(punchPass);
  } catch (error) {
    console.error('Error creating punch pass:', error);
    res.status(500).json({ error: 'Failed to create punch pass' });
  }
});

/**
 * PUT /api/admin/punch-passes/:id
 * Update a punch pass (admin only)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, expirationDays, isTransferable, isActive, displayOrder } = req.body;

    const punchPass = await prisma.punchPass.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(expirationDays && { expirationDays: parseInt(expirationDays) }),
        ...(isTransferable !== undefined && { isTransferable }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder) })
      }
    });

    res.json(punchPass);
  } catch (error) {
    console.error('Error updating punch pass:', error);
    res.status(500).json({ error: 'Failed to update punch pass' });
  }
});

/**
 * DELETE /api/admin/punch-passes/:id
 * Soft delete (archive) a punch pass (admin only)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const punchPass = await prisma.punchPass.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Punch pass archived' });
  } catch (error) {
    console.error('Error deleting punch pass:', error);
    res.status(500).json({ error: 'Failed to delete punch pass' });
  }
});

export default router;
